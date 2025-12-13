const { Pool } = require('pg');
require('dotenv').config();

// Database name to create
const NEW_DB_NAME = 'maisha_db';

// Connect to default 'postgres' database to create new database
const adminPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres', // Connect to default database
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function createDatabase() {
  const client = await adminPool.connect();
  
  try {
    console.log('🔄 Checking if database exists...');
    
    // Check if database already exists
    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [NEW_DB_NAME]
    );
    
    if (checkResult.rows.length > 0) {
      console.log(`✓ Database '${NEW_DB_NAME}' already exists`);
      return NEW_DB_NAME;
    }
    
    // Create the database
    console.log(`🔄 Creating database '${NEW_DB_NAME}'...`);
    await client.query(`CREATE DATABASE ${NEW_DB_NAME}`);
    console.log(`✅ Database '${NEW_DB_NAME}' created successfully!`);
    
    return NEW_DB_NAME;
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    throw error;
  } finally {
    client.release();
    await adminPool.end();
  }
}

// Run if called directly
if (require.main === module) {
  createDatabase()
    .then((dbName) => {
      console.log(`\n✅ Database setup complete: ${dbName}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed to create database:', error);
      process.exit(1);
    });
}

module.exports = { createDatabase, NEW_DB_NAME };
