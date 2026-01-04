-- Migration: NID Verification System for All Users
-- This creates a dedicated table for tracking NID verification requests

-- NID Verifications Table (for all users, not just workers)
CREATE TABLE IF NOT EXISTS nid_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- User consent and submission
    user_consent BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- NID Image (temporary - will be deleted after processing)
    nid_image_url VARCHAR(500),
    nid_image_path VARCHAR(500), -- Local file path for deletion
    
    -- Extracted data from Gemini OCR
    extracted_data JSONB, -- Stores all extracted fields
    
    -- Verification metadata
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'auto_rejected')),
    extraction_confidence INTEGER, -- 0-100
    image_quality VARCHAR(20) CHECK (image_quality IN ('Good', 'Average', 'Poor')),
    tampering_suspected BOOLEAN DEFAULT FALSE,
    language_detected VARCHAR(20), -- 'Bangla', 'English', 'Mixed'
    
    -- Validation results
    name_match BOOLEAN,
    nid_format_valid BOOLEAN,
    age_valid BOOLEAN, -- Must be 18+
    nid_unique BOOLEAN, -- Not used by another account
    
    -- Admin review
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    admin_notes TEXT,
    
    -- Auto-rejection reasons
    auto_rejection_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nid_verifications_user_id ON nid_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_nid_verifications_status ON nid_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_nid_verifications_submitted_at ON nid_verifications(submitted_at);

-- Index for checking NID uniqueness (extracted from JSONB)
CREATE INDEX IF NOT EXISTS idx_nid_verifications_nid_number ON nid_verifications((extracted_data->>'nid_number'));

-- Add NID verification status to users table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'nid_verification_status'
    ) THEN
        ALTER TABLE users ADD COLUMN nid_verification_status VARCHAR(20) DEFAULT 'not_submitted' 
        CHECK (nid_verification_status IN ('not_submitted', 'pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Add NID number to users table if not exists (encrypted field)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'nid_number_encrypted'
    ) THEN
        ALTER TABLE users ADD COLUMN nid_number_encrypted TEXT; -- Encrypted NID number
    END IF;
END $$;

-- Function to update user verification status when NID verification is approved
CREATE OR REPLACE FUNCTION update_user_verification_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.verification_status = 'approved' AND OLD.verification_status != 'approved' THEN
        UPDATE users 
        SET nid_verification_status = 'approved',
            is_verified = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;
    ELSIF NEW.verification_status = 'rejected' AND OLD.verification_status != 'rejected' THEN
        UPDATE users 
        SET nid_verification_status = 'rejected',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;
    ELSIF NEW.verification_status = 'pending' THEN
        UPDATE users 
        SET nid_verification_status = 'pending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user verification status
DROP TRIGGER IF EXISTS trigger_update_user_verification_status ON nid_verifications;
CREATE TRIGGER trigger_update_user_verification_status
    AFTER UPDATE OF verification_status ON nid_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_user_verification_status();

-- Verification Logs Table (for audit trail)
CREATE TABLE IF NOT EXISTS nid_verification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_id UUID REFERENCES nid_verifications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'submitted', 'auto_rejected', 'admin_approved', 'admin_rejected'
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for auto actions
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nid_verification_logs_verification_id ON nid_verification_logs(verification_id);
CREATE INDEX IF NOT EXISTS idx_nid_verification_logs_user_id ON nid_verification_logs(user_id);

COMMENT ON TABLE nid_verifications IS 'Stores NID verification requests for all users with OCR extracted data';
COMMENT ON TABLE nid_verification_logs IS 'Audit log for all NID verification actions';



