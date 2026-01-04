const bcrypt = require('bcryptjs');

const passwords = {
  admin: 'Admin@12345',
  user: 'Test123456',
  worker: 'Worker123'
};

async function generateHashes() {
  console.log('Generating password hashes...\n');
  
  for (const [role, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`${role.toUpperCase()} Password: ${password}`);
    console.log(`Hash: ${hash}\n`);
  }
  
  console.log('\nCopy these hashes to your seed.sql file or use the createAdmin.js script.');
}

generateHashes().catch(console.error);





