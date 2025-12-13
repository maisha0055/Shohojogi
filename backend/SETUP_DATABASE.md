# Database Setup Instructions

## Prerequisites
1. **PostgreSQL must be installed** on your system
2. **PostgreSQL service must be running**

## Step 1: Update .env file with your PostgreSQL credentials

Edit `backend/.env` and update these values with your actual PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=maisha_db
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
```

**Common defaults:**
- Username: `postgres`
- Password: (the password you set during PostgreSQL installation)
- Port: `5432`

## Step 2: Create the database

Run one of these commands:

### Option A: Using the Node.js script (recommended)
```bash
cd backend
node create_database.js
```

### Option B: Using psql command line
```bash
psql -U postgres -c "CREATE DATABASE maisha_db;"
```

### Option C: Using pgAdmin
1. Open pgAdmin 4
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → "Create" → "Database"
4. Name: `maisha_db`
5. Click "Save"

## Step 3: Initialize the database schema

After creating the database, run:

```bash
cd backend
npm run db:init
```

This will create all the necessary tables.

## Step 4: (Optional) Seed initial data

```bash
npm run db:seed
```

## Troubleshooting

### "password authentication failed"
- Check your PostgreSQL username and password in the `.env` file
- Make sure PostgreSQL is running: Check Services (services.msc) for "postgresql" service

### "connection refused" or "could not connect"
- Ensure PostgreSQL service is running
- Check if the port (default 5432) is correct
- Verify DB_HOST is correct (use `localhost` for local installations)

### "database does not exist"
- Make sure you created the database first (Step 2)
- Verify the DB_NAME in `.env` matches the created database name
