-- Migration: Fix worker_profiles.verification_status for workers with approved NID verification
-- This updates workers who have approved NID verification but their worker_profiles.verification_status is still 'pending'

UPDATE worker_profiles wp
SET verification_status = 'verified', updated_at = CURRENT_TIMESTAMP
FROM users u
WHERE wp.user_id = u.id
  AND u.role = 'worker'
  AND u.nid_verification_status = 'approved'
  AND (wp.verification_status IS NULL OR wp.verification_status = 'pending');

-- Verify the update
SELECT 
  u.id,
  u.full_name,
  u.nid_verification_status,
  wp.verification_status as worker_verification_status,
  wp.availability_status,
  u.is_active
FROM users u
INNER JOIN worker_profiles wp ON u.id = wp.user_id
WHERE u.role = 'worker'
  AND u.nid_verification_status = 'approved'
ORDER BY u.full_name;

