const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('🔄 Testing PostgreSQL connection...\n');
  console.log('Connection details:');
  console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  Port: ${process.env.DB_PORT || 5432}`);
  console.log(`  User: ${process.env.DB_USER || 'postgres'}`);
  console.log(`  Database: postgres (default)\n`);

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ Connection successful!');
    console.log(`PostgreSQL version: ${result.rows[0].version.split(',')[0]}\n`);
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Connection failed!\n');
    console.error(`Error: ${error.message}\n`);
    
    if (error.code === '28P01') {
      console.error('💡 This is an authentication error.');
      console.error('   Please check your DB_USER and DB_PASSWORD in the .env file.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 PostgreSQL server is not running or not accessible.');
      console.error('   Please ensure PostgreSQL service is running.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 Cannot find the database host.');
      console.error('   Please check your DB_HOST in the .env file.');
    }
    
    await pool.end();
    return false;
  }
}

if (require.main === module) {
  testConnection().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testConnection };
