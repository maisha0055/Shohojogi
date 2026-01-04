-- Migration: Add Face Verification fields to nid_verifications table
-- Execute this in pgAdmin 4 Query Tool

-- Add face verification columns to nid_verifications table
ALTER TABLE nid_verifications 
ADD COLUMN IF NOT EXISTS selfie_image_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_descriptor JSONB, -- 128-dimensional face descriptor
ADD COLUMN IF NOT EXISTS face_verification_results JSONB, -- Stores all face matching results
ADD COLUMN IF NOT EXISTS face_match_passed BOOLEAN DEFAULT FALSE;

-- Add index for face verification queries
CREATE INDEX IF NOT EXISTS idx_nid_verifications_face_match ON nid_verifications(face_match_passed) WHERE face_match_passed IS NOT NULL;

-- Add comment
COMMENT ON COLUMN nid_verifications.selfie_image_url IS 'URL or base64 of the live selfie captured during verification';
COMMENT ON COLUMN nid_verifications.selfie_descriptor IS '128-dimensional face descriptor extracted from selfie';
COMMENT ON COLUMN nid_verifications.face_verification_results IS 'JSON object containing face matching results (selfie vs profile, selfie vs NID, etc.)';
COMMENT ON COLUMN nid_verifications.face_match_passed IS 'Boolean indicating if all required face matches passed';


