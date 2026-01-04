require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔄 Running NID Verification Migration...\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migration_nid_verification.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✅ NID Verification migration completed successfully!');
    console.log('\n📋 Created tables:');
    console.log('   - nid_verifications');
    console.log('   - nid_verification_logs');
    console.log('\n📋 Updated tables:');
    console.log('   - users (added nid_verification_status, nid_number_encrypted)');
    console.log('\n✅ All database changes applied successfully!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.log('⚠️  Some tables may already exist. This is okay.');
    } else {
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration();



