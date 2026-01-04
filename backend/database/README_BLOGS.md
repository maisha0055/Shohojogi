# Blog Seed Data Instructions

## To populate the database with blog posts:

### Option 1: Using psql (PostgreSQL command line)
```bash
# Connect to your database
psql -U your_username -d your_database_name

# Run the seed file
\i database/seed_blogs.sql
```

### Option 2: Using pgAdmin or any PostgreSQL client
1. Open pgAdmin or your PostgreSQL client
2. Connect to your database
3. Open the SQL Editor
4. Copy and paste the contents of `seed_blogs.sql`
5. Execute the script

### Option 3: Using Node.js script
```bash
cd backend
node -e "const { Pool } = require('pg'); const fs = require('fs'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); const sql = fs.readFileSync('database/seed_blogs.sql', 'utf8'); pool.query(sql).then(() => { console.log('Blogs seeded successfully!'); process.exit(0); }).catch(err => { console.error('Error:', err); process.exit(1); });"
```

## Verify blogs are inserted:
```sql
SELECT COUNT(*) FROM blog_posts WHERE is_published = true;
```

You should see 15 blog posts.

