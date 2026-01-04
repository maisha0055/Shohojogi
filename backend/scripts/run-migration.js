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
  const client = await pool.connect();
  try {
    console.log('Running migration: Make worker_id nullable for call_worker bookings...');
    
    // Check if worker_id is already nullable
    const checkResult = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name = 'worker_id'
    `);
    
    if (checkResult.rows.length > 0 && checkResult.rows[0].is_nullable === 'YES') {
      console.log('✓ worker_id is already nullable');
    } else {
      // Make worker_id nullable
      await client.query('ALTER TABLE bookings ALTER COLUMN worker_id DROP NOT NULL');
      console.log('✓ Made worker_id nullable');
    }
    
    // Update booking_type constraint
    await client.query('ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_type_check');
    await client.query(`
      ALTER TABLE bookings 
      ADD CONSTRAINT bookings_booking_type_check 
      CHECK (booking_type IN ('instant', 'scheduled', 'call_worker'))
    `);
    console.log('✓ Updated booking_type constraint');
    
    // Update foreign key to allow NULL
    await client.query(`
      ALTER TABLE bookings 
      DROP CONSTRAINT IF EXISTS bookings_worker_id_fkey
    `);
    await client.query(`
      ALTER TABLE bookings 
      ADD CONSTRAINT bookings_worker_id_fkey 
      FOREIGN KEY (worker_id) 
      REFERENCES users(id) 
      ON DELETE CASCADE
    `);
    console.log('✓ Updated foreign key constraint');
    
    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);

