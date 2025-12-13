# 🚀 START HERE - Run Your Project

## ✅ What's Been Set Up

1. ✅ Created `.env` file with database configuration
2. ✅ Database name configured: `maisha_db`
3. ✅ PostgreSQL service is running
4. ✅ All setup scripts created

## ⚠️ One Step Remaining

**You need to update your PostgreSQL password in `backend/.env`**

Open `backend/.env` and change:
```
DB_PASSWORD=postgres
```
to your actual PostgreSQL password.

## 🎯 Quick Start (3 Steps)

### Step 1: Update Password
Edit `backend/.env` → Set `DB_PASSWORD=your_password`

### Step 2: Run Setup
```bash
cd backend
node setup.js
```

This will:
- Create the `maisha_db` database
- Initialize all tables
- Set up the schema

### Step 3: Start Server
```bash
npm run dev
```

Server will run on: `http://localhost:5050`

## 🔄 Alternative: If Database Already Exists

If `maisha_db` already exists, skip setup and just run:

```bash
cd backend
npm run db:init
npm run dev
```

## 📚 Need Help?

- See `README_SETUP.md` for detailed instructions
- See `SETUP_DATABASE.md` for database-specific help
- Test connection: `node test_db_connection.js`

## 🎉 That's It!

Once the password is set, everything else is automated!
