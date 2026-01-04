const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Create PostgreSQL connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting profile_photo column migration...');
    console.log('📊 Checking current column type...');
    
    // Check current column type
    const checkResult = await client.query(`
      SELECT 
        data_type,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'profile_photo';
    `);
    
    if (checkResult.rows.length === 0) {
      console.error('❌ Column profile_photo not found in users table!');
      process.exit(1);
    }
    
    const currentType = checkResult.rows[0].data_type;
    const maxLength = checkResult.rows[0].character_maximum_length;
    
    console.log(`   Current type: ${currentType}${maxLength ? `(${maxLength})` : ''}`);
    
    if (currentType === 'text') {
      console.log('✅ Column is already TEXT type. No migration needed.');
      process.exit(0);
    }
    
    console.log('🔄 Changing column type from VARCHAR to TEXT...');
    
    // Run the migration
    await client.query('BEGIN');
    
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN profile_photo TYPE TEXT;
    `);
    
    await client.query(`
      COMMENT ON COLUMN users.profile_photo IS 'Profile photo URL or base64 encoded image (TEXT to support long values)';
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!');
    console.log('   Column profile_photo is now TEXT type and can store longer values.');
    
    // Verify the change
    const verifyResult = await client.query(`
      SELECT data_type
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'profile_photo';
    `);
    
    console.log(`✅ Verified: Column type is now ${verifyResult.rows[0].data_type}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error('   Error details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });


