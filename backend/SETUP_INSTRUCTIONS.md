# Database Setup Instructions

## Quick Setup (Run these commands)

### 1. Create Admin User
```bash
cd backend
node createAdmin.js
```

This will create/update the admin user with:
- **Email**: `admin@workercalling.com`
- **Password**: `Admin@12345`

### 2. Seed Sample Workers
```bash
node seedWorkers.js
```

This will create 8 sample workers in different categories:
- Carpenter
- Electrician
- Plumber
- Mechanic
- Painter
- AC Technician
- Cleaning Service
- Key Maker

All workers use password: `Worker123`

### 3. Verify Setup
After running the scripts, you should be able to:
- Login as admin: `admin@workercalling.com` / `Admin@12345`
- See workers at: `http://localhost:3000/workers`
- Login as any worker: `{worker-email}` / `Worker123`

## Alternative: Generate Password Hashes Only

If you want to generate hashes for manual database insertion:

```bash
node generateHash.js
```

This will output password hashes that you can use in SQL queries.

## Troubleshooting

### Admin Login Fails
- Make sure you ran `node createAdmin.js`
- Check that the database connection is working
- Verify the admin user exists: `SELECT * FROM users WHERE email = 'admin@workercalling.com';`

### No Workers Showing
- Make sure you ran `node seedWorkers.js`
- Verify service categories exist: `SELECT * FROM service_categories;`
- Check workers exist: `SELECT u.full_name, wp.verification_status FROM users u JOIN worker_profiles wp ON u.id = wp.user_id WHERE u.role = 'worker';`
- Workers must have `verification_status = 'verified'` to show up

### Database Connection Issues
- Check your `.env` file has correct database credentials
- Ensure PostgreSQL is running
- Verify database exists and tables are created (run `init.sql` first)





