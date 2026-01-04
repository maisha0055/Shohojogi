-- Quick Fix Script for Instant Booking "pending_estimation" Error
-- Run this script directly in your PostgreSQL database

-- Step 1: Make worker_id nullable (if not already)
ALTER TABLE bookings ALTER COLUMN worker_id DROP NOT NULL;

-- Step 2: Drop existing booking_type constraint (if exists)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_type_check;

-- Step 3: Add booking_type constraint with 'call_worker'
ALTER TABLE bookings 
  ADD CONSTRAINT bookings_booking_type_check 
  CHECK (booking_type IN ('instant', 'scheduled', 'call_worker'));

-- Step 4: Drop existing status constraint (try all possible names)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_check;

-- Step 5: Find and drop any other status-related constraints
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc 
          ON tc.constraint_name = cc.constraint_name
          AND tc.constraint_schema = cc.constraint_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'bookings'
          AND tc.constraint_type = 'CHECK'
          AND cc.check_clause LIKE '%status%'
    ) LOOP
        EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- Step 6: Add new status constraint with 'pending_estimation'
ALTER TABLE bookings 
  ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'pending_estimation', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'));

-- Step 7: Create booking_images table (if not exists)
CREATE TABLE IF NOT EXISTS booking_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_images_booking_id ON booking_images(booking_id);

-- Step 8: Create worker_estimates table (if not exists)
CREATE TABLE IF NOT EXISTS worker_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    estimated_price DECIMAL(10, 2) NOT NULL,
    note TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(booking_id, worker_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_estimates_booking_id ON worker_estimates(booking_id);
CREATE INDEX IF NOT EXISTS idx_worker_estimates_worker_id ON worker_estimates(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_estimates_status ON worker_estimates(status);

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✓ Successfully updated bookings table constraints';
    RAISE NOTICE '✓ worker_id is now nullable';
    RAISE NOTICE '✓ booking_type now includes call_worker';
    RAISE NOTICE '✓ status now includes pending_estimation';
    RAISE NOTICE '✓ booking_images table created/verified';
    RAISE NOTICE '✓ worker_estimates table created/verified';
END $$;

