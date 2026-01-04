-- Migration: Make service_description nullable for call_worker bookings
-- This allows call_worker bookings to work without service_description (images are the primary description)
-- Run this migration to update the bookings table

-- Make service_description nullable
ALTER TABLE bookings 
  ALTER COLUMN service_description DROP NOT NULL;

-- Add a comment explaining the change
COMMENT ON COLUMN bookings.service_description IS 'Service description. Optional for call_worker bookings where images serve as the primary description.';

