-- Migration: Add support for 'call_worker' booking type and nullable worker_id
-- Run this migration to update the bookings table

-- Step 1: Make worker_id nullable (for call_worker bookings where worker hasn't accepted yet)
ALTER TABLE bookings 
  ALTER COLUMN worker_id DROP NOT NULL;

-- Step 2: Update booking_type constraint to include 'call_worker'
ALTER TABLE bookings 
  DROP CONSTRAINT IF EXISTS bookings_booking_type_check;

ALTER TABLE bookings 
  ADD CONSTRAINT bookings_booking_type_check 
  CHECK (booking_type IN ('instant', 'scheduled', 'call_worker'));

-- Step 3: Add a new table for scheduled time slots that workers can accept
CREATE TABLE IF NOT EXISTS scheduled_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'accepted', 'expired')),
    accepted_by_worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(booking_id, scheduled_date, scheduled_time)
);

CREATE INDEX idx_scheduled_slots_booking_id ON scheduled_slots(booking_id);
CREATE INDEX idx_scheduled_slots_status ON scheduled_slots(status);
CREATE INDEX idx_scheduled_slots_date_time ON scheduled_slots(scheduled_date, scheduled_time);

