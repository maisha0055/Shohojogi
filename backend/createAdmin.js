require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('./src/config/database');

async function createAdmin() {
  try {
    const email = 'admin@workercalling.com';
    const password = 'Admin@12345';
    
    // Check if admin already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      console.log('Admin user already exists. Updating password and ensuring active status...');
      const hash = await bcrypt.hash(password, 10);
      await query(
        'UPDATE users SET password = $1, is_verified = $2, is_active = $3 WHERE email = $4',
        [hash, true, true, email]
      );
      console.log('✅ Admin password and status updated successfully!');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      console.log(`Role: admin`);
      console.log(`Status: Active & Verified`);
    } else {
      console.log('Creating admin user...');
      const hash = await bcrypt.hash(password, 10);
      await query(
        `INSERT INTO users (email, password, full_name, phone, role, is_verified, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [email, hash, 'System Administrator', '+8801700000000', 'admin', true, true]
      );
      console.log('✅ Admin user created successfully!');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      console.log(`Role: admin`);
      console.log(`Status: Active & Verified`);
    }
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin().then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});





