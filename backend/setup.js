const { createDatabase } = require('./create_database');
const { testConnection } = require('./test_db_connection');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function setup() {
  console.log('🚀 Maisha Project Database Setup\n');
  console.log('='.repeat(60));
  
  // Step 1: Test connection
  console.log('\n📋 Step 1: Testing database connection...');
  const connected = await testConnection();
  
  if (!connected) {
    console.log('\n❌ Cannot proceed without a valid database connection.');
    console.log('\n📝 Please update backend/.env with your PostgreSQL credentials:');
    console.log('   - DB_USER: Your PostgreSQL username');
    console.log('   - DB_PASSWORD: Your PostgreSQL password');
    console.log('\nThen run this script again.\n');
    process.exit(1);
  }
  
  // Step 2: Create database
  console.log('\n📋 Step 2: Creating database...');
  try {
    await createDatabase();
  } catch (error) {
    console.error('\n❌ Failed to create database:', error.message);
    process.exit(1);
  }
  
  // Step 3: Initialize schema
  console.log('\n📋 Step 3: Initializing database schema...');
  try {
    const { stdout, stderr } = await execAsync('npm run db:init', { cwd: __dirname });
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) console.error(stderr);
    console.log('✅ Database schema initialized!');
  } catch (error) {
    console.error('❌ Failed to initialize schema:', error.message);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Setup complete!');
  console.log('='.repeat(60));
  console.log('\n📝 Next steps:');
  console.log('   1. (Optional) Seed initial data: npm run db:seed');
  console.log('   2. Start the server: npm run dev');
  console.log('\n');
}

if (require.main === module) {
  setup().catch(error => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
}

module.exports = { setup };
