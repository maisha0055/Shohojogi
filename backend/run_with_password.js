const readline = require('readline');
const { createDatabase } = require('./create_database');
const { testConnection } = require('./test_db_connection');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupWithPassword() {
  console.log('🚀 Maisha Project Database Setup\n');
  console.log('='.repeat(60));
  
  // Try current password first
  console.log('\n📋 Testing connection with current .env settings...');
  let connected = await testConnection();
  
  if (!connected) {
    console.log('\n⚠️  Connection failed with current credentials.');
    console.log('Let\'s try to find the correct password.\n');
    
    const tryPassword = await question('Enter your PostgreSQL password (or press Enter to skip and update .env manually): ');
    
    if (tryPassword.trim()) {
      // Temporarily update password
      process.env.DB_PASSWORD = tryPassword;
      console.log('\n🔄 Testing with provided password...');
      connected = await testConnection();
      
      if (connected) {
        console.log('✅ Connection successful!');
        console.log('\n💡 Please update backend/.env with:');
        console.log(`   DB_PASSWORD=${tryPassword}\n`);
      } else {
        console.log('❌ Still cannot connect. Please check your credentials.\n');
        rl.close();
        process.exit(1);
      }
    } else {
      console.log('\n📝 Please update backend/.env with your PostgreSQL password and run:');
      console.log('   node setup.js\n');
      rl.close();
      process.exit(1);
    }
  }
  
  // Create database
  console.log('\n📋 Creating database...');
  try {
    await createDatabase();
  } catch (error) {
    console.error('\n❌ Failed to create database:', error.message);
    rl.close();
    process.exit(1);
  }
  
  // Initialize schema
  console.log('\n📋 Initializing database schema...');
  try {
    const { stdout, stderr } = await execAsync('npm run db:init', { cwd: __dirname });
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) console.error(stderr);
    console.log('✅ Database schema initialized!');
  } catch (error) {
    console.error('❌ Failed to initialize schema:', error.message);
    rl.close();
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Setup complete!');
  console.log('='.repeat(60));
  console.log('\n📝 Next steps:');
  console.log('   1. (Optional) Seed initial data: npm run db:seed');
  console.log('   2. Start the server: npm run dev');
  console.log('\n');
  
  rl.close();
}

if (require.main === module) {
  setupWithPassword().catch(error => {
    console.error('\n❌ Setup failed:', error);
    rl.close();
    process.exit(1);
  });
}

module.exports = { setupWithPassword };
