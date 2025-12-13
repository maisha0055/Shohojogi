const { pool } = require('./src/config/database');

/**
 * Drop all tables in the correct order (respecting foreign key constraints)
 */
async function dropAllTables() {
  console.log('🔄 Dropping all existing tables...\n');
  
  // Get list of all tables
  const tablesResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tablesResult.rows.map(row => row.table_name);
  
  if (tables.length === 0) {
    console.log('✓ No tables to drop');
    return;
  }

  console.log(`Found ${tables.length} tables to drop`);

  // Drop all triggers and functions first
  try {
    await pool.query(`
      DO $$ 
      DECLARE 
        r RECORD;
      BEGIN
        -- Drop all triggers
        FOR r IN (SELECT trigger_name, event_object_table 
                  FROM information_schema.triggers 
                  WHERE trigger_schema = 'public') 
        LOOP
          EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || 
                  ' ON ' || quote_ident(r.event_object_table) || ' CASCADE';
        END LOOP;
        
        -- Drop all functions
        FOR r IN (SELECT routine_name, routine_type 
                  FROM information_schema.routines 
                  WHERE routine_schema = 'public'
                  AND routine_type = 'FUNCTION') 
        LOOP
          EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('✓ Dropped all triggers and functions');
  } catch (err) {
    console.warn('⚠ Error dropping triggers/functions (may not exist):', err.message);
  }

  // Drop all tables with CASCADE to handle dependencies
  for (const table of tables) {
    try {
      await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
      console.log(`✓ Dropped table: ${table}`);
    } catch (err) {
      console.error(`⚠ Failed to drop table ${table}:`, err.message);
    }
  }

  console.log('\n✅ All tables dropped successfully\n');
}

/**
 * Main migration function
 */
(async () => {
  try {
    console.log('='.repeat(60));
    console.log('🚀 Database Migration Script');
    console.log('='.repeat(60));
    console.log(`Database: ${process.env.DB_NAME || 'N/A'}\n`);

    // Step 1: Drop all tables
    await dropAllTables();

    // Step 2: Run init.sql using the fixed runner
    console.log('🔄 Running init.sql with fixed parser...\n');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync('node run_init_fixed.js', {
        cwd: __dirname,
        env: process.env
      });
      
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (err) {
      console.error('❌ Error running init.sql:', err.message);
      throw err;
    }

    // Step 3: Verify tables were created
    console.log('\n🔄 Verifying database schema...');
    const verifyResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const createdTables = verifyResult.rows.map(row => row.table_name);
    console.log(`✓ Found ${createdTables.length} tables after migration`);
    
    const expectedTables = [
      'users', 'service_categories', 'worker_profiles', 'bookings',
      'reviews', 'payments', 'messages', 'notifications', 'reports',
      'fraud_detection_logs', 'blog_posts'
    ];

    console.log('\n📋 Created tables:');
    createdTables.forEach(table => {
      const isExpected = expectedTables.includes(table);
      console.log(`   ${isExpected ? '✓' : '⚠'} ${table}`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('   Next step: Run seed.sql or use: node run_seed.js\n');

  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

