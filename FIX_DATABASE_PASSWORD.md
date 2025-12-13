# Fix Database Password Authentication Error

## ❌ Current Problem
- **Error**: `password authentication failed for user "postgres"`
- **Cause**: The PostgreSQL password in `backend/.env` is incorrect
- **Result**: Backend cannot start because it can't connect to the database

## 🔧 Solution: Update Database Password

### Step 1: Find Your PostgreSQL Password
Your PostgreSQL password is one of these:
1. The password you set during PostgreSQL installation
2. The password you use to connect to pgAdmin 4
3. If you don't remember, you may need to reset it

### Step 2: Update backend/.env File

1. Open `backend/.env` in a text editor
2. Find this line:
   ```
   DB_PASSWORD=postgres
   ```
3. Replace `postgres` with your actual PostgreSQL password:
   ```
   DB_PASSWORD=your_actual_password_here
   ```
4. Save the file

### Step 3: Restart Backend

After updating the password, the backend should restart automatically (nodemon will detect the change).

Or manually restart:
```bash
cd backend
npm run dev
```

## 🔍 How to Find Your Password

### Option 1: Check pgAdmin 4
1. Open pgAdmin 4
2. Try to connect to your PostgreSQL server
3. The password you use there is the one you need

### Option 2: Check Installation Notes
- Look for any notes you saved during PostgreSQL installation
- Check if you wrote down the password

### Option 3: Reset Password (if needed)
If you can't remember the password, you may need to:
1. Reset it through pgAdmin 4
2. Or reset it via PostgreSQL configuration files

## ✅ After Fixing Password

Once you update the password:
1. ✅ Backend will connect to database
2. ✅ Server will start on port 5051
3. ✅ API endpoints will work
4. ✅ Frontend can connect successfully

## 🎯 Quick Test

After updating password, test the connection:
```bash
cd backend
node test_db_connection.js
```

This will tell you if the password is correct.

---

**Update the DB_PASSWORD in backend/.env and the backend will start automatically!** 🔑
