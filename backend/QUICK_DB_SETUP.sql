-- Quick Database Setup for pgAdmin 4
-- Copy and paste this entire file into pgAdmin 4 Query Tool

-- Step 1: Create database (if not exists)
-- Note: You may need to connect to 'postgres' database first to create maisha_db
SELECT 'CREATE DATABASE maisha_db' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'maisha_db')\gexec

-- Step 2: Connect to maisha_db database
\c maisha_db

-- Step 3: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 4: Check if tables already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'Tables do not exist. Please run the full init.sql script.';
    ELSE
        RAISE NOTICE 'Tables already exist. Database is ready!';
    END IF;
END $$;

-- Quick check: List all tables
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
