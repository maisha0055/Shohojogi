-- Migration: Add loyalty_tier column to users table
-- Execute this in pgAdmin 4 Query Tool

-- Add loyalty_tier column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(20) DEFAULT 'Bronze' CHECK (loyalty_tier IN ('Bronze', 'Silver', 'Gold'));

-- Update existing users to have Bronze tier if they don't have one
UPDATE users 
SET loyalty_tier = 'Bronze' 
WHERE loyalty_tier IS NULL;

-- Create a function to automatically update loyalty tier based on points
CREATE OR REPLACE FUNCTION update_loyalty_tier()
RETURNS TRIGGER AS $$
BEGIN
    -- Update tier based on loyalty points
    NEW.loyalty_tier = CASE
        WHEN NEW.loyalty_points >= 150 THEN 'Gold'
        WHEN NEW.loyalty_points >= 50 THEN 'Silver'
        ELSE 'Bronze'
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update tier when points change
DROP TRIGGER IF EXISTS trigger_update_loyalty_tier ON users;
CREATE TRIGGER trigger_update_loyalty_tier
BEFORE UPDATE OF loyalty_points ON users
FOR EACH ROW
WHEN (OLD.loyalty_points IS DISTINCT FROM NEW.loyalty_points)
EXECUTE FUNCTION update_loyalty_tier();

-- Initial tier update for all existing users
UPDATE users 
SET loyalty_tier = CASE
    WHEN loyalty_points >= 150 THEN 'Gold'
    WHEN loyalty_points >= 50 THEN 'Silver'
    ELSE 'Bronze'
END
WHERE loyalty_tier IS NULL OR loyalty_tier = 'Bronze';

