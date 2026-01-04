// Script to run database migrations
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  try {
    console.log('🔄 Running loyalty_tier migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migration_add_loyalty_tier.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the column exists
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'loyalty_tier'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ loyalty_tier column exists:', result.rows[0]);
    } else {
      console.log('❌ loyalty_tier column not found!');
    }
    
    // Check existing users
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Total users in database: ${userCount.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    console.error('Error details:', error.message);
    if (error.code === '42710') {
      console.log('ℹ️  Column might already exist. This is okay.');
      process.exit(0);
    }
    process.exit(1);
  }
}

runMigration();

