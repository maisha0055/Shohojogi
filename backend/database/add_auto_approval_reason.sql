-- Add auto_approval_reason column to nid_verifications table
ALTER TABLE nid_verifications 
ADD COLUMN IF NOT EXISTS auto_approval_reason TEXT;

