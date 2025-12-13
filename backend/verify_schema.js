const { pool } = require('./src/config/database');

(async () => {
  try {
    // Check tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('📋 Created tables:');
    const tables = tablesResult.rows.map(r => r.table_name);
    tables.forEach(t => console.log(`   ✓ ${t}`));
    console.log(`\nTotal: ${tables.length} tables\n`);
    
    // Check users table columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Users table columns (should be snake_case):');
    columnsResult.rows.forEach(c => {
      console.log(`   ${c.column_name.padEnd(25)} - ${c.data_type}`);
    });
    
    // Check for snake_case vs camelCase
    const snakeCaseColumns = columnsResult.rows.filter(c => c.column_name.includes('_'));
    const camelCaseColumns = columnsResult.rows.filter(c => /[a-z][A-Z]/.test(c.column_name));
    
    console.log(`\n✓ Snake_case columns: ${snakeCaseColumns.length}`);
    if (camelCaseColumns.length > 0) {
      console.log(`⚠ CamelCase columns found: ${camelCaseColumns.map(c => c.column_name).join(', ')}`);
    } else {
      console.log('✓ All columns are in snake_case format\n');
    }
    
    // Check functions
    const functionsResult = await pool.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION';
    `);
    
    console.log('📋 Created functions:');
    functionsResult.rows.forEach(f => console.log(`   ✓ ${f.routine_name}`));
    
    // Check triggers
    const triggersResult = await pool.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public';
    `);
    
    console.log('\n📋 Created triggers:');
    triggersResult.rows.forEach(t => console.log(`   ✓ ${t.trigger_name} on ${t.event_object_table}`));
    
    console.log('\n✅ Schema verification complete!\n');
    
  } catch (error) {
    console.error('❌ Verification error:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

