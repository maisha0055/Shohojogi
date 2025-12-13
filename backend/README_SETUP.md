# Quick Setup Guide

## Prerequisites
- Node.js (v18 or higher)
- PostgreSQL installed and running
- Your PostgreSQL username and password

## Quick Start

### 1. Update Database Credentials

Edit `backend/.env` and set your PostgreSQL credentials:

```env
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
```

**Note:** If you don't remember your PostgreSQL password:
- Windows: Check if you set it during installation
- You can reset it or check PostgreSQL configuration files

### 2. Run Setup Script

```bash
cd backend
node setup.js
```

This will:
- ✅ Test database connection
- ✅ Create database `maisha_db`
- ✅ Initialize all tables
- ✅ Set up the schema

### 3. (Optional) Seed Initial Data

```bash
npm run db:seed
```

### 4. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:5050`

## Manual Database Creation

If the automated script doesn't work, you can create the database manually:

### Using pgAdmin:
1. Open pgAdmin 4
2. Connect to your PostgreSQL server
3. Right-click "Databases" → "Create" → "Database"
4. Name: `maisha_db`
5. Click "Save"

### Using psql:
```bash
psql -U postgres
CREATE DATABASE maisha_db;
\q
```

Then run:
```bash
npm run db:init
```

## Troubleshooting

### "password authentication failed"
- Verify your PostgreSQL username and password in `.env`
- Make sure PostgreSQL service is running

### "connection refused"
- Ensure PostgreSQL is installed and running
- Check if port 5432 is correct
- Verify DB_HOST is `localhost`

### "database does not exist"
- Create the database first (see Manual Database Creation above)
- Verify DB_NAME in `.env` matches the created database

## Testing Connection

Test your database connection:
```bash
node test_db_connection.js
```

## Project Structure

- `server.js` - Main server file
- `src/` - Application source code
- `database/init.sql` - Database schema
- `database/seed.sql` - Initial seed data
- `.env` - Environment variables (create this file)
