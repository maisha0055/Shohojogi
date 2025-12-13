const fs = require('fs');
const path = require('path');
const { pool, getClient } = require('./src/config/database');

/**
 * Split SQL file into statements, handling dollar-quoted blocks properly
 * This is a more robust parser that tracks dollar quote state
 */
function splitSQLStatements(sql) {
  const statements = [];
  let buffer = '';
  let inDollarQuote = false;
  let dollarTag = null;
  let i = 0;

  while (i < sql.length) {
    if (sql[i] === '$' && !inDollarQuote) {
      // Check for start of dollar quote: $$ or $tag$
      const dollarStart = i;
      let j = i + 1;
      let tag = '';
      
      // Read until closing $
      while (j < sql.length && sql[j] !== '$') {
        tag += sql[j];
        j++;
      }
      
      if (j < sql.length) {
        // Found closing $, this is a dollar quote tag
        dollarTag = '$' + tag + '$';
        inDollarQuote = true;
        buffer += dollarTag;
        i = j + 1;
        continue;
      }
    } else if (inDollarQuote && sql[i] === '$') {
      // Check if this is the end tag
      const dollarStart = i;
      let j = i + 1;
      let tag = '';
      
      while (j < sql.length && sql[j] !== '$') {
        tag += sql[j];
        j++;
      }
      
      if (j < sql.length) {
        const potentialTag = '$' + tag + '$';
        if (potentialTag === dollarTag) {
          // Found matching end tag
          buffer += potentialTag;
          inDollarQuote = false;
          dollarTag = null;
          i = j + 1;
          continue;
        }
      }
    } else if (!inDollarQuote && sql[i] === ';') {
      // Potential statement terminator
      // Look ahead to see if followed by whitespace/newline
      let j = i + 1;
      while (j < sql.length && (sql[j] === ' ' || sql[j] === '\t' || sql[j] === '\r')) {
        j++;
      }
      
      if (j >= sql.length || sql[j] === '\n') {
        // This is a statement terminator
        const stmt = buffer.trim();
        if (stmt && !stmt.match(/^[\s-]*$/)) {
          statements.push(stmt);
        }
        buffer = '';
        // Skip past the semicolon and whitespace
        i = j;
        if (i < sql.length && sql[i] === '\n') i++;
        continue;
      }
    }
    
    buffer += sql[i];
    i++;
  }
  
  // Add final statement if any
  const remaining = buffer.trim();
  if (remaining && !remaining.match(/^[\s-]*$/)) {
    statements.push(remaining);
  }
  
  return statements;
}

(async () => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const sqlPath = path.join(__dirname, 'database', 'init.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🔄 Loading init.sql...');
    console.log('🔄 Parsing SQL statements with dollar-quote support...\n');
    
    const statements = splitSQLStatements(sql);
    
    // Filter out empty/comment-only statements  
    const validStatements = statements.filter(stmt => {
      const cleaned = stmt.trim();
      return cleaned && 
             !cleaned.match(/^[\s-]*$/) && 
             cleaned.replace(/--.*$/gm, '').trim().length > 0;
    });
    
    console.log(`✓ Parsed ${validStatements.length} valid statements\n`);
    console.log('🔄 Executing statements in transaction...\n');

    let executed = 0;
    let skipped = 0;
    const errors = [];

    // Execute statements sequentially within transaction
    for (let i = 0; i < validStatements.length; i++) {
      const stmt = validStatements[i].trim();
      
      // Identify statement type for logging
      const stmtType = stmt.split(/\s+/)[0].toUpperCase();
      
      try {
        await client.query(stmt);
        executed++;
        
        // Show progress
        if ((i + 1) % 3 === 0 || i === validStatements.length - 1) {
          process.stdout.write(`\r  Progress: ${i + 1}/${validStatements.length} statements executed...`);
        }
      } catch (err) {
        // Check if error is "already exists" - that's OK
        const isAlreadyExists = 
          err.message.includes('already exists') ||
          err.code === '42P07' || // duplicate_table
          err.code === '42710' || // duplicate_object
          err.code === '42723';   // duplicate_function

        if (isAlreadyExists) {
          executed++;
          skipped++;
        } else {
          errors.push({ index: i + 1, error: err, stmt: stmt.substring(0, 80) });
          
          // Don't break on dependency errors - continue and see what happens
          if (err.code === '42P01') { // undefined_table
            console.error(`\n⚠ Warning at statement ${i + 1}: ${err.message.split('\n')[0]}`);
          }
        }
      }
    }

    // Commit transaction if no critical errors
    if (errors.filter(e => e.error.code === '42P01').length === 0) {
      await client.query('COMMIT');
      console.log(`\n\n✅ Transaction committed successfully!`);
    } else {
      await client.query('ROLLBACK');
      console.log(`\n\n❌ Transaction rolled back due to errors`);
    }
    
    console.log(`   ✓ Successfully executed: ${executed} (${skipped} skipped as duplicates)`);
    if (errors.length > 0) {
      console.log(`   ⚠ Errors encountered: ${errors.length}`);
      errors.slice(0, 5).forEach(err => {
        console.error(`   Statement ${err.index}: ${err.error.message.split('\n')[0]}`);
      });
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Fatal error executing init.sql:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();

