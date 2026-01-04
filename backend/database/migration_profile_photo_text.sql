-- Migration: Change profile_photo column from VARCHAR(500) to TEXT
-- This allows storing longer URLs and base64 encoded images
-- Execute this in pgAdmin 4 Query Tool

-- Change profile_photo column type to TEXT to support longer URLs
ALTER TABLE users 
ALTER COLUMN profile_photo TYPE TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.profile_photo IS 'Profile photo URL or base64 encoded image (TEXT to support long values)';


