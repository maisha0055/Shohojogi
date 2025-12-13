# 🚀 Quick Start - Run the Project

## Current Status
✅ PostgreSQL service is running  
✅ .env file created with database name: `maisha_db`  
⚠️  Need to update PostgreSQL password in `.env`

## Next Steps

### Option 1: Update Password in .env (Recommended)

1. Open `backend/.env` in a text editor
2. Find the line: `DB_PASSWORD=postgres`
3. Replace `postgres` with your actual PostgreSQL password
4. Save the file
5. Run: `cd backend && node setup.js`

### Option 2: If You Don't Know Your PostgreSQL Password

**Windows:**
1. Open pgAdmin 4 (if installed)
2. Try to connect - it might remember your password
3. Or check if you saved it during installation

**Reset Password (if needed):**
1. Open Command Prompt as Administrator
2. Navigate to PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\18\bin`)
3. Run: `psql -U postgres`
4. If it asks for password and you don't know it, you may need to reset it via pg_hba.conf

### Option 3: Try Common Defaults

The script will try these common passwords:
- `postgres` (current)
- Empty password
- `admin`
- `root`

## After Password is Set

Once you've updated the password, run:

```bash
cd backend
node setup.js
```

This will:
1. ✅ Test connection
2. ✅ Create `maisha_db` database  
3. ✅ Initialize all tables
4. ✅ Ready to run!

Then start the server:
```bash
npm run dev
```

## Database Created Successfully?

If the database `maisha_db` already exists, you can skip creation and just initialize:

```bash
cd backend
npm run db:init
npm run dev
```
