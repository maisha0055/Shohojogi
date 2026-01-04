-- Migration: Add 'pending_estimation' status to bookings table
-- This allows call_worker bookings to use the pending_estimation status
-- Run this migration to update the bookings status constraint

-- Step 1: Drop the existing status constraint
ALTER TABLE bookings 
  DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Step 2: Add new constraint with pending_estimation included
ALTER TABLE bookings 
  ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('pending', 'pending_estimation', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'));

-- Verify the constraint was updated
DO $$
BEGIN
  RAISE NOTICE '✓ Successfully updated bookings status constraint to include pending_estimation';
END $$;

