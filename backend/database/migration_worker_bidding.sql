-- Migration: Worker Bidding System for Instant Worker Call
-- This adds support for image-based worker bidding/estimation

-- Booking Images Table
CREATE TABLE IF NOT EXISTS booking_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_images_booking_id ON booking_images(booking_id);

-- Worker Estimates Table
CREATE TABLE IF NOT EXISTS worker_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    estimated_price DECIMAL(10, 2) NOT NULL,
    note TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(booking_id, worker_id) -- One estimate per worker per booking
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_worker_estimates_booking_id ON worker_estimates(booking_id);
CREATE INDEX IF NOT EXISTS idx_worker_estimates_worker_id ON worker_estimates(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_estimates_status ON worker_estimates(status);

-- Update bookings table to support new status
-- Add 'pending_estimation' status if not exists
DO $$ 
BEGIN
    -- Check if constraint exists and update it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_status_check'
    ) THEN
        -- Drop old constraint
        ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
    END IF;
    
    -- Add new constraint with pending_estimation
    ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
    CHECK (status IN ('pending', 'pending_estimation', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'));
END $$;

-- Add comment
COMMENT ON TABLE booking_images IS 'Stores images uploaded by users for instant worker call requests';
COMMENT ON TABLE worker_estimates IS 'Stores worker price estimates/bids for instant worker call requests';
COMMENT ON COLUMN worker_estimates.status IS 'pending: waiting for user selection, accepted: user selected this estimate, rejected: user selected another worker';

