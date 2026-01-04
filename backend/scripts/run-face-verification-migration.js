require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔄 Running Face Verification Migration...\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migration_add_face_verification.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✅ Face Verification migration completed successfully!');
    console.log('\n📋 Added columns to nid_verifications table:');
    console.log('   - selfie_image_url');
    console.log('   - selfie_descriptor');
    console.log('   - face_verification_results');
    console.log('   - face_match_passed');
    console.log('\n✅ All database changes applied successfully!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.log('⚠️  Some columns may already exist. This is okay.');
    } else {
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration();


