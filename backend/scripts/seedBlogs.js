// Script to seed blog posts into the database
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use the same connection config as the main app
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seedBlogs() {
  try {
    console.log('🌱 Starting blog seed...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/seed_blogs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sql);
    
    console.log('✅ Blog posts seeded successfully!');
    
    // Verify the blogs were inserted
    const result = await pool.query('SELECT COUNT(*) as count FROM blog_posts WHERE is_published = true');
    console.log(`📊 Total published blogs: ${result.rows[0].count}`);
    
    // Show sample blogs
    const sampleResult = await pool.query('SELECT title_en, category FROM blog_posts WHERE is_published = true LIMIT 5');
    console.log('\n📝 Sample blogs:');
    sampleResult.rows.forEach((blog, index) => {
      console.log(`   ${index + 1}. ${blog.title_en} (${blog.category})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding blogs:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

seedBlogs();

