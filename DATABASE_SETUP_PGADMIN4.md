# Database Setup Instructions for pgAdmin 4

## ✅ Current Status
- Database `maisha_db` is already created and connected
- PostgreSQL is running and accessible

## 📋 Step-by-Step Instructions for pgAdmin 4

### Step 1: Open pgAdmin 4
1. Launch **pgAdmin 4** from your Start Menu or desktop
2. Enter your PostgreSQL master password if prompted

### Step 2: Connect to PostgreSQL Server
1. In the left sidebar, expand **Servers**
2. Click on **PostgreSQL 18** (or your PostgreSQL version)
3. Enter your password if needed
4. You should see the server connected

### Step 3: Create Database (if not exists)
1. Right-click on **Databases** in the left sidebar
2. Select **Create** → **Database...**
3. In the **General** tab:
   - **Database name**: `maisha_db`
4. Click **Save**

### Step 4: Open Query Tool
1. Expand **Databases** → **maisha_db**
2. Right-click on **maisha_db**
3. Select **Query Tool** (or press `Alt + Shift + Q`)

### Step 5: Run Initialization Script
1. Open the file: `backend/database/init.sql`
2. Copy **ALL** the contents (Ctrl + A, then Ctrl + C)
3. Paste into the Query Tool in pgAdmin 4
4. Click the **Execute** button (▶️ Play icon) or press **F5**
5. Wait for execution to complete
6. Check the **Messages** tab at the bottom for success messages

### Step 6: Verify Tables Created
1. In the left sidebar, expand **maisha_db** → **Schemas** → **public** → **Tables**
2. You should see these tables:
   - ✅ users
   - ✅ service_categories
   - ✅ worker_profiles
   - ✅ bookings
   - ✅ reviews
   - ✅ messages
   - ✅ notifications
   - ✅ favorites
   - ✅ loyalty_points_history
   - ✅ reports
   - ✅ fraud_detection_logs
   - ✅ blog_posts

### Step 7: (Optional) Seed Initial Data
1. Open the file: `backend/database/seed.sql`
2. Copy all contents
3. In pgAdmin 4 Query Tool, paste and execute (F5)
4. This will add sample categories and test data

## 🔍 Verify Database Connection

### Check Connection from Backend:
```bash
cd backend
node test_db_connection.js
```

### Or test directly:
```bash
cd backend
node -e "require('dotenv').config(); const { Pool } = require('pg'); const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD }); pool.query('SELECT COUNT(*) FROM users').then(res => { console.log('✅ Database connected! Users table exists.'); pool.end(); }).catch(err => { console.log('❌ Error:', err.message); process.exit(1); });"
```

## 🛠️ Quick SQL Queries for pgAdmin 4

### Check if database exists:
```sql
SELECT datname FROM pg_database WHERE datname = 'maisha_db';
```

### Check if tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Check users table:
```sql
SELECT COUNT(*) as user_count FROM users;
```

### View all tables:
```sql
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
```

## ⚠️ Troubleshooting

### Error: "database does not exist"
- Run Step 3 to create the database

### Error: "relation already exists"
- This means tables already exist - that's OK!
- You can skip the init.sql if tables are already there

### Error: "permission denied"
- Make sure you're using the correct PostgreSQL user (usually `postgres`)
- Check your `.env` file has correct credentials

### Error: "connection refused"
- Make sure PostgreSQL service is running
- Check port 5432 is not blocked by firewall

## 📝 Database Configuration

Your `.env` file should have:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=maisha_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

## ✅ Success Indicators

After running init.sql, you should see:
- ✅ Messages like "CREATE TABLE" for each table
- ✅ Messages like "CREATE INDEX" for indexes
- ✅ Messages like "CREATE FUNCTION" for triggers
- ✅ No ERROR messages

## 🎯 Next Steps

After database setup:
1. ✅ Backend server should connect automatically
2. ✅ Test the API endpoints
3. ✅ Try registering a new user
4. ✅ Login should work

---

**Need Help?** Check the backend logs for database connection messages.
