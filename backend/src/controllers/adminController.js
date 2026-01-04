const { query, transaction } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendVerificationApprovedEmail } = require('../services/emailService');
const { deleteImage } = require('../config/cloudinary');
const { encrypt } = require('../utils/encryption');

// @desc Get pending worker verifications (DEPRECATED - Use GET /api/admin/nid-verifications/pending)
// @route GET /api/admin/verifications/pending
// @access Private (Admin only)
// NOTE: This endpoint is deprecated. Use unified NID verification endpoint instead.
const getPendingVerifications = asyncHandler(async (req, res) => {
  // Redirect to unified NID verification system
  return res.status(301).json({
    success: false,
    message: 'This endpoint is deprecated. Please use GET /api/admin/nid-verifications/pending instead.',
    redirect: '/api/admin/nid-verifications/pending',
    note: 'Workers now use the same NID verification system as users.'
  });
});

// @desc Approve worker verification (DEPRECATED - Use PUT /api/admin/nid-verifications/:verificationId/approve)
// @route PUT /api/admin/verifications/:workerId/approve
// @access Private (Admin only)
// NOTE: This endpoint is deprecated. Use unified NID verification endpoint instead.
const approveVerification = asyncHandler(async (req, res) => {
  // Redirect to unified NID verification system
  return res.status(301).json({
    success: false,
    message: 'This endpoint is deprecated. Please use PUT /api/admin/nid-verifications/:verificationId/approve instead.',
    redirect: '/api/admin/nid-verifications/:verificationId/approve',
    note: 'Workers now use the same NID verification system as users.'
  });
});

// @desc Reject worker verification (DEPRECATED - Use PUT /api/admin/nid-verifications/:verificationId/reject)
// @route PUT /api/admin/verifications/:workerId/reject
// @access Private (Admin only)
// NOTE: This endpoint is deprecated. Use unified NID verification endpoint instead.
const rejectVerification = asyncHandler(async (req, res) => {
  // Redirect to unified NID verification system
  return res.status(301).json({
    success: false,
    message: 'This endpoint is deprecated. Please use PUT /api/admin/nid-verifications/:verificationId/reject instead.',
    redirect: '/api/admin/nid-verifications/:verificationId/reject',
    note: 'Workers now use the same NID verification system as users.'
  });
});

// @desc Get all users
// @route GET /api/admin/users
// @access Private (Admin only)
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.role,
        u.profile_photo,
        u.is_active,
        u.is_verified,
        u.created_at,
        CASE 
          WHEN u.role = 'worker' THEN wp.is_featured
          ELSE false
        END as is_featured
      FROM users u
      LEFT JOIN worker_profiles wp ON u.id = wp.user_id
      ORDER BY u.created_at DESC`,
      []
    );

    res.json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// @desc Deactivate user
// @route PUT /api/admin/users/:userId/deactivate
// @access Private (Admin only)
const deactivateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await query(
    'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [userId]
  );

  res.json({
    success: true,
    message: 'User deactivated successfully'
  });
});

// @desc Activate user
// @route PUT /api/admin/users/:userId/activate
// @access Private (Admin only)
const activateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await query(
    'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [userId]
  );

  // Create notification for worker activation
  const userCheck = await query('SELECT role FROM users WHERE id = $1', [userId]);
  if (userCheck.rows.length > 0 && userCheck.rows[0].role === 'worker') {
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [userId, 'Account Activated ✓', 'Your worker account has been activated! You can now receive bookings.', 'system']
    );
  }

  res.json({
    success: true,
    message: 'User activated successfully'
  });
});

// @desc Get all reports
// @route GET /api/admin/reports
// @access Private (Admin only)
const getReports = asyncHandler(async (req, res) => {
  try {
    // Check if reports table exists
    const tableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reports'
      )`
    );
    
    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        data: []
      });
    }

    const result = await query(
      `SELECT 
        r.*,
        reporter.full_name as reporter_name,
        reported.full_name as reported_user_name
      FROM reports r
      INNER JOIN users reporter ON r.reporter_id = reporter.id
      INNER JOIN users reported ON r.reported_user_id = reported.id
      ORDER BY r.created_at DESC`,
      []
    );

    res.json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error in getReports:', error);
    res.json({
      success: true,
      data: []
    });
  }
});

// @desc Update report status
// @route PUT /api/admin/reports/:reportId
// @access Private (Admin only)
const updateReportStatus = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status } = req.body;

  await query(
    `UPDATE reports 
     SET status = $1, resolved_at = CURRENT_TIMESTAMP 
     WHERE id = $2`,
    [status, reportId]
  );

  res.json({
    success: true,
    message: 'Report status updated'
  });
});

// @desc Mark review as fake
// @route PUT /api/admin/reviews/:reviewId/mark-fake
// @access Private (Admin only)
const markReviewAsFake = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  await query(
    'UPDATE reviews SET is_fake = true WHERE id = $1',
    [reviewId]
  );

  res.json({
    success: true,
    message: 'Review marked as fake'
  });
});

// @desc Get platform statistics
// @route GET /api/admin/stats
// @access Private (Admin only)
const getPlatformStats = asyncHandler(async (req, res) => {
  try {
    // Check if nid_verifications table exists
    const tableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'nid_verifications'
      )`
    );
    const nidTableExists = tableCheck.rows[0].exists;

    // Build pending_verifications query conditionally
    let pendingVerificationsQuery = `0 as pending_verifications`;
    if (nidTableExists) {
      pendingVerificationsQuery = `COALESCE((
        SELECT COUNT(*) 
        FROM nid_verifications nv
        INNER JOIN users u ON nv.user_id = u.id
        LEFT JOIN worker_profiles wp ON u.id = wp.user_id AND u.role = 'worker'
        WHERE nv.verification_status IN ('pending', 'approved', 'auto_rejected') 
          AND (nv.reviewed_by IS NULL)
          AND (u.role != 'worker' OR wp.verification_status IS NULL OR wp.verification_status != 'verified')
      ), 0) as pending_verifications`;
    }

    // Check if reports table exists
    const reportsTableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reports'
      )`
    );
    const reportsTableExists = reportsTableCheck.rows[0].exists;
    
    const openReportsQuery = reportsTableExists 
      ? `(SELECT COUNT(*) FROM reports WHERE status IN ('pending', 'investigating'))`
      : `0`;
    
    const stats = await query(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'worker') as total_workers,
        COALESCE((SELECT COUNT(*) FROM bookings), 0) as total_bookings,
        ${pendingVerificationsQuery},
        ${openReportsQuery} as open_reports,
        COALESCE((SELECT SUM(final_price) FROM bookings WHERE payment_status = 'paid'), 0) as total_revenue`,
      []
    );

    const recentBookings = await query(
      `SELECT 
        b.id,
        b.service_description,
        b.created_at,
        u.full_name as user_name,
        w.full_name as worker_name
      FROM bookings b
      INNER JOIN users u ON b.user_id = u.id
      INNER JOIN users w ON b.worker_id = w.id
      ORDER BY b.created_at DESC
      LIMIT 10`,
      []
    );

    res.json({
      success: true,
      data: {
        ...stats.rows[0],
        recent_bookings: recentBookings.rows || []
      }
    });
  } catch (error) {
    console.error('Error in getPlatformStats:', error);
    // Return default stats if query fails
    res.json({
      success: true,
      data: {
        total_users: 0,
        total_workers: 0,
        total_bookings: 0,
        pending_verifications: 0,
        open_reports: 0,
        total_revenue: 0,
        recent_bookings: []
      }
    });
  }
});

// @desc Toggle worker featured status
// @route PUT /api/admin/workers/:workerId/feature
// @access Private (Admin only)
const toggleFeatureWorker = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  await query(
    `UPDATE worker_profiles 
     SET is_featured = NOT is_featured, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [workerId]
  );

  res.json({
    success: true,
    message: 'Worker featured status updated'
  });
});

// @desc Get pending NID verifications (includes pending, approved, and rejected)
// @route GET /api/admin/nid-verifications/pending
// @access Private (Admin only)
const getPendingNIDVerifications = asyncHandler(async (req, res) => {
  try {
    // Check if nid_verifications table exists
    const tableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'nid_verifications'
      )`
    );
    
    if (!tableCheck.rows[0].exists) {
      return res.json({
        success: true,
        data: []
      });
    }

    const { status } = req.query; // Optional filter: 'pending', 'approved', 'rejected', 'auto_rejected', or 'all'
    
    let statusFilter = '';
    let reviewedFilter = '';
    
    if (status === 'all') {
      // Show all unreviewed verifications (pending, auto-approved, auto_rejected that haven't been reviewed)
      // This is the default view for admin dashboard - only show verifications that need review
      statusFilter = `AND nv.verification_status IN ('pending', 'approved', 'auto_rejected')`;
      reviewedFilter = `AND (nv.reviewed_by IS NULL)`;
    } else if (status && status !== 'all') {
      // For specific status, filter by that status
      if (status === 'approved') {
        statusFilter = `AND nv.verification_status = 'approved'`;
        // Show both auto-approved (not reviewed) and admin-approved (reviewed)
        reviewedFilter = ''; // Show all approved, regardless of review status
      } else if (status === 'rejected') {
        statusFilter = `AND nv.verification_status IN ('rejected', 'auto_rejected')`;
        reviewedFilter = ''; // Show all rejected, regardless of review status
      } else {
        statusFilter = `AND nv.verification_status = $1`;
        // For 'pending', only show unreviewed ones
        if (status === 'pending') {
          reviewedFilter = `AND (nv.reviewed_by IS NULL)`;
        }
      }
    } else {
      // Default (no status param): show all pending, auto-approved, and auto_rejected that haven't been reviewed by admin yet
      statusFilter = `AND nv.verification_status IN ('pending', 'approved', 'auto_rejected')`;
      reviewedFilter = `AND (nv.reviewed_by IS NULL)`;
    }
    
    // Exclude verified workers from pending verifications (only if showing pending/unreviewed)
    const excludeVerifiedWorkers = (status === 'all' || (status && status !== 'pending')) 
      ? '' 
      : `AND (u.role != 'worker' OR wp.verification_status IS NULL OR wp.verification_status != 'verified')`;
    
    // Build the query with proper parameterization
    const params = [];
    if (status && status !== 'all' && status !== 'approved' && status !== 'rejected' && status !== 'pending') {
      params.push(status);
    }
    
    let queryText = `
      SELECT 
        nv.id,
        nv.user_id,
        nv.submitted_at,
        nv.verification_status,
        nv.extraction_confidence,
        nv.image_quality,
        nv.tampering_suspected,
        nv.language_detected,
        nv.name_match,
        nv.age_valid,
        nv.nid_unique,
        nv.auto_rejection_reason,
        nv.auto_approval_reason,
        nv.extracted_data,
        nv.nid_image_url,
        nv.selfie_image_url,
        nv.selfie_descriptor,
        nv.face_verification_results,
        nv.face_match_passed,
        nv.reviewed_by,
        nv.reviewed_at,
        nv.rejection_reason,
        nv.admin_notes,
        u.email,
        u.full_name as user_full_name,
        u.phone,
        u.role,
        u.is_active,
        u.profile_photo,
        u.created_at as user_created_at,
        -- Include worker-specific information if user is a worker
        CASE WHEN u.role = 'worker' THEN wp.service_category_id ELSE NULL END as service_category_id,
        CASE WHEN u.role = 'worker' THEN sc.name_en ELSE NULL END as service_category_name,
        CASE WHEN u.role = 'worker' THEN wp.experience_years ELSE NULL END as experience_years,
        CASE WHEN u.role = 'worker' THEN wp.hourly_rate ELSE NULL END as hourly_rate,
        CASE WHEN u.role = 'worker' THEN wp.bio ELSE NULL END as bio,
        CASE WHEN u.role = 'worker' THEN wp.skills ELSE NULL END as skills,
        CASE WHEN u.role = 'worker' THEN wp.availability_status ELSE NULL END as availability_status,
        CASE WHEN u.role = 'worker' THEN wp.average_rating ELSE NULL END as average_rating,
        CASE WHEN u.role = 'worker' THEN wp.total_reviews ELSE NULL END as total_reviews,
        CASE WHEN u.role = 'worker' THEN wp.total_jobs_completed ELSE NULL END as total_jobs_completed,
        u.address
        FROM nid_verifications nv
      INNER JOIN users u ON nv.user_id = u.id
      LEFT JOIN worker_profiles wp ON u.id = wp.user_id AND u.role = 'worker'
      LEFT JOIN service_categories sc ON wp.service_category_id = sc.id
      WHERE 1=1 ${statusFilter} ${reviewedFilter} ${excludeVerifiedWorkers}
      ORDER BY 
        CASE nv.verification_status
          WHEN 'pending' THEN 1
          WHEN 'auto_rejected' THEN 2
          WHEN 'approved' THEN 3
          WHEN 'rejected' THEN 4
          ELSE 5
        END,
        nv.submitted_at DESC
    `;
    
    console.log('[Admin] Fetching NID verifications with filter:', statusFilter, reviewedFilter);
    console.log('[Admin] Query params:', params);
    const result = await query(queryText, params);
    console.log('[Admin] Found', result.rows.length, 'verifications');
    
    // Process results to restore full NID image URLs if truncated
    const processedRows = result.rows.map(verification => {
      // If nid_image_url is truncated (ends with '...'), get the full image from extracted_data.nid_image_full
      if (verification.nid_image_url && verification.nid_image_url.endsWith('...')) {
        try {
          const extractedData = typeof verification.extracted_data === 'string' 
            ? JSON.parse(verification.extracted_data) 
            : verification.extracted_data;
          
          if (extractedData && extractedData.nid_image_full) {
            // Replace truncated URL with full image URL
            verification.nid_image_url = extractedData.nid_image_full;
          }
        } catch (error) {
          console.error('[Admin] Error parsing extracted_data to get full NID image:', error);
          // If parsing fails, keep the truncated URL
        }
      }
      return verification;
    });
    
    // Log first verification if exists for debugging
    if (processedRows.length > 0) {
      console.log('[Admin] First verification sample:', {
        id: processedRows[0].id,
        user_id: processedRows[0].user_id,
        status: processedRows[0].verification_status,
        has_selfie: !!processedRows[0].selfie_image_url,
        has_face_verification: !!processedRows[0].face_verification_results,
        has_nid_image: !!processedRows[0].nid_image_url && !processedRows[0].nid_image_url.endsWith('...')
      });
    }
    
    res.json({
      success: true,
      count: processedRows.length,
      data: processedRows || []
    });
  } catch (error) {
    console.error('Error in getPendingNIDVerifications:', error);
    res.json({
      success: true,
      count: 0,
      data: []
    });
  }
});

// @desc Get all NID verifications
// @route GET /api/admin/nid-verifications
// @access Private (Admin only)
const getAllNIDVerifications = asyncHandler(async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  
  let queryText = `
    SELECT 
      nv.id,
      nv.user_id,
      nv.verification_status,
      nv.submitted_at,
      nv.extraction_confidence,
      nv.image_quality,
      nv.name_match,
      nv.age_valid,
      nv.reviewed_at,
      nv.reviewed_by,
      nv.rejection_reason,
      nv.admin_notes,
      u.email,
      u.full_name as user_full_name,
      u.role,
      u.is_active
    FROM nid_verifications nv
    INNER JOIN users u ON nv.user_id = u.id
  `;
  
  const params = [];
  if (status) {
    queryText += ` WHERE nv.verification_status = $1`;
    params.push(status);
  }
  
  queryText += ` ORDER BY nv.submitted_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), parseInt(offset));
  
  const result = await query(queryText, params);
  
  res.json({
    success: true,
    count: result.rows.length,
    data: result.rows
  });
});

// @desc Get NID verification details
// @route GET /api/admin/nid-verifications/:verificationId
// @access Private (Admin only)
const getNIDVerificationDetails = asyncHandler(async (req, res) => {
  const { verificationId } = req.params;
  
  const result = await query(
    `SELECT 
      nv.*,
      u.email,
      u.full_name as user_full_name,
      u.phone,
      u.role,
      u.is_active,
      u.profile_photo,
      u.created_at as user_created_at,
      reviewer.email as reviewer_email,
      reviewer.full_name as reviewer_name
    FROM nid_verifications nv
    INNER JOIN users u ON nv.user_id = u.id
    LEFT JOIN users reviewer ON nv.reviewed_by = reviewer.id
    WHERE nv.id = $1`,
    [verificationId]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'NID verification not found'
    });
  }
  
  const verification = result.rows[0];
  
  // If nid_image_url is truncated (ends with '...'), get the full image from extracted_data.nid_image_full
  if (verification.nid_image_url && verification.nid_image_url.endsWith('...')) {
    try {
      const extractedData = typeof verification.extracted_data === 'string' 
        ? JSON.parse(verification.extracted_data) 
        : verification.extracted_data;
      
      if (extractedData && extractedData.nid_image_full) {
        // Replace truncated URL with full image URL
        verification.nid_image_url = extractedData.nid_image_full;
      }
    } catch (error) {
      console.error('[Admin] Error parsing extracted_data to get full NID image:', error);
      // If parsing fails, keep the truncated URL
    }
  }
  
  res.json({
    success: true,
    data: verification
  });
});

// @desc Approve NID verification
// @route PUT /api/admin/nid-verifications/:verificationId/approve
// @access Private (Admin only)
const approveNIDVerification = asyncHandler(async (req, res) => {
  const { verificationId } = req.params;
  const { admin_notes } = req.body;
  const adminId = req.user.id;
  
  const result = await transaction(async (client) => {
    // Get verification details - allow approving pending, auto_rejected, or approved verifications
    const verificationResult = await client.query(
      `SELECT user_id, nid_image_url, extracted_data, verification_status
       FROM nid_verifications 
       WHERE id = $1 AND verification_status IN ('pending', 'auto_rejected', 'approved', 'rejected')`,
      [verificationId]
    );
    
    if (verificationResult.rows.length === 0) {
      throw new Error('NID verification not found or already processed');
    }
    
    const verification = verificationResult.rows[0];
    // extracted_data is JSONB, already parsed by PostgreSQL driver
    const extractedData = verification.extracted_data;
    
    // Update verification status
    await client.query(
      `UPDATE nid_verifications 
       SET verification_status = 'approved',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           admin_notes = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [adminId, admin_notes || null, verificationId]
    );
    
    // Encrypt and store NID number in users table (only if NID number was extracted)
    if (extractedData && extractedData.nid_number) {
      const { encrypt } = require('../utils/encryption');
      const encryptedNID = encrypt(extractedData.nid_number);
      
      await client.query(
        `UPDATE users 
         SET nid_verification_status = 'approved',
             nid_number_encrypted = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [encryptedNID, verification.user_id]
      );
    } else {
      // If no NID number extracted, just update verification status
      await client.query(
        `UPDATE users 
         SET nid_verification_status = 'approved',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [verification.user_id]
      );
    }
    
    // Log the action
    await client.query(
      `INSERT INTO nid_verification_logs (verification_id, user_id, action, performed_by, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        verificationId,
        verification.user_id,
        'admin_approved',
        adminId,
        JSON.stringify({ admin_notes })
      ]
    );
    
    // Check if user is a worker
    const userCheck = await client.query(
      'SELECT role, is_active FROM users WHERE id = $1',
      [verification.user_id]
    );
    const isWorker = userCheck.rows.length > 0 && userCheck.rows[0].role === 'worker';
    const isActive = userCheck.rows.length > 0 && userCheck.rows[0].is_active;
    
    // If user is a worker, update worker_profiles.verification_status to 'verified'
    if (isWorker) {
      await client.query(
        `UPDATE worker_profiles 
         SET verification_status = 'verified', updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [verification.user_id]
      );
      console.log(`[Admin] Updated worker_profiles.verification_status to 'verified' for worker ${verification.user_id}`);
    }
    
    // Create notification
    let notificationMessage = 'Your NID verification has been approved.';
    if (isWorker && !isActive) {
      notificationMessage += ' Your account is pending admin activation.';
    } else if (isWorker && isActive) {
      notificationMessage += ' Your worker profile is now verified and active.';
    }
    
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        verification.user_id,
        'NID Verification Approved',
        notificationMessage,
        'system'
      ]
    );
    
    // Get user details for email
    const userResult = await client.query(
      'SELECT email, full_name FROM users WHERE id = $1',
      [verification.user_id]
    );
    
    // Delete NID image after approval (privacy compliance)
    // Only delete if it's a Cloudinary URL (not base64)
    if (verification.nid_image_url && verification.nid_image_url.startsWith('http')) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = verification.nid_image_url.split('/');
        const publicId = urlParts[urlParts.length - 1].split('.')[0];
        const folder = urlParts[urlParts.length - 2];
        const fullPublicId = folder ? `${folder}/${publicId}` : publicId;
        
        await deleteImage(fullPublicId);
        console.log(`[Admin] Deleted NID image after approval: ${fullPublicId}`);
      } catch (err) {
        console.error('Error deleting NID image after approval:', err);
        // Don't fail the transaction if image deletion fails
      }
    } else if (verification.nid_image_url && verification.nid_image_url.startsWith('data:')) {
      // Base64 image - no need to delete, just log
      console.log('[Admin] Base64 image used (no deletion needed)');
    }
    
    return userResult.rows[0];
  });
  
  // Send approval email
  if (result) {
    try {
      await sendVerificationApprovedEmail(result.email, result.full_name);
    } catch (err) {
      console.error('Error sending approval email:', err);
    }
  }
  
  res.json({
    success: true,
    message: 'NID verification approved successfully',
    data: result
  });
});

// @desc Reject NID verification
// @route PUT /api/admin/nid-verifications/:verificationId/reject
// @access Private (Admin only)
const rejectNIDVerification = asyncHandler(async (req, res) => {
  const { verificationId } = req.params;
  const { rejection_reason, admin_notes } = req.body;
  const adminId = req.user.id;
  
  if (!rejection_reason) {
    return res.status(400).json({
      success: false,
      message: 'Rejection reason is required'
    });
  }
  
  const result = await transaction(async (client) => {
    // Get verification details - allow rejecting pending, auto_rejected, or approved verifications
    const verificationResult = await client.query(
      `SELECT user_id, nid_image_url 
       FROM nid_verifications 
       WHERE id = $1 AND verification_status IN ('pending', 'auto_rejected', 'approved', 'rejected')`,
      [verificationId]
    );
    
    if (verificationResult.rows.length === 0) {
      throw new Error('NID verification not found or already processed');
    }
    
    const verification = verificationResult.rows[0];
    
    // Update verification status
    await client.query(
      `UPDATE nid_verifications 
       SET verification_status = 'rejected',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           rejection_reason = $2,
           admin_notes = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [adminId, rejection_reason, admin_notes || null, verificationId]
    );
    
    // Update user status
    await client.query(
      `UPDATE users 
       SET nid_verification_status = 'rejected',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [verification.user_id]
    );
    
    // Log the action
    await client.query(
      `INSERT INTO nid_verification_logs (verification_id, user_id, action, performed_by, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        verificationId,
        verification.user_id,
        'admin_rejected',
        adminId,
        JSON.stringify({ rejection_reason, admin_notes })
      ]
    );
    
    // Create notification with rejection reason
    const notificationMessage = rejection_reason 
      ? `Your NID verification has been rejected. Reason: ${rejection_reason}. You can resubmit with a new NID image.`
      : 'Your NID verification has been rejected. Please provide valid NID and information. You can resubmit with a new NID image.';
    
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        verification.user_id,
        'NID Verification Rejected',
        notificationMessage,
        'system'
      ]
    );
    
    // Delete NID image after rejection
    // Only delete if it's a Cloudinary URL (not base64)
    if (verification.nid_image_url && verification.nid_image_url.startsWith('http')) {
      try {
        const urlParts = verification.nid_image_url.split('/');
        const publicId = urlParts[urlParts.length - 1].split('.')[0];
        const folder = urlParts[urlParts.length - 2];
        const fullPublicId = folder ? `${folder}/${publicId}` : publicId;
        
        await deleteImage(fullPublicId);
        console.log(`[Admin] Deleted NID image after rejection: ${fullPublicId}`);
      } catch (err) {
        console.error('Error deleting NID image after rejection:', err);
      }
    } else if (verification.nid_image_url && verification.nid_image_url.startsWith('data:')) {
      // Base64 image - no need to delete, just log
      console.log('[Admin] Base64 image used (no deletion needed)');
    }
    
    return { user_id: verification.user_id };
  });
  
  res.json({
    success: true,
    message: 'NID verification rejected successfully'
  });
});

module.exports = {
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getAllUsers,
  deactivateUser,
  activateUser,
  getReports,
  updateReportStatus,
  markReviewAsFake,
  getPlatformStats,
  toggleFeatureWorker,
  getPendingNIDVerifications,
  getAllNIDVerifications,
  getNIDVerificationDetails,
  approveNIDVerification,
  rejectNIDVerification
};