const fs = require('fs');
const path = require('path');
const { pool } = require('./src/config/database');

(async () => {
  const backupDir = path.join(__dirname, 'backups');
  
  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('✓ Created backups directory');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

  try {
    console.log('🔄 Starting database backup...');
    
    // Get list of all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`✓ Found ${tables.length} tables to backup`);

    const backup = {
      timestamp: new Date().toISOString(),
      database: process.env.DB_NAME,
      tables: {}
    };

    // Backup each table
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT * FROM ${table};`);
        backup.tables[table] = {
          rowCount: result.rowCount,
          columns: result.fields.map(f => f.name),
          data: result.rows
        };
        console.log(`✓ Backed up table: ${table} (${result.rowCount} rows)`);
      } catch (error) {
        console.error(`⚠ Failed to backup table ${table}:`, error.message);
        backup.tables[table] = {
          error: error.message
        };
      }
    }

    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📁 Backup saved to: ${backupFile}`);
    console.log(`📊 Total tables backed up: ${tables.length}`);
    
    return backupFile;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
})();

