const { query, transaction } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all pending worker verifications
// @route   GET /api/admin/verifications/pending
// @access  Private (Admin)
const getPendingVerifications = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT 
      u.id,
      u.email,
      u.full_name,
      u.phone,
      u.created_at,
      wp.nid_number,
      wp.nid_image_url,
      wp.extracted_nid_data,
      wp.verification_status,
      sc.name_en as service_category
    FROM users u
    INNER JOIN worker_profiles wp ON u.id = wp.user_id
    LEFT JOIN service_categories sc ON wp.service_category_id = sc.id
    WHERE wp.verification_status = 'pending'
    ORDER BY u.created_at DESC`
  );

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Approve worker verification
// @route   PUT /api/admin/verifications/:workerId/approve
// @access  Private (Admin)
const approveVerification = asyncHandler(async (req, res) => {
  const { workerId } = req.params;
  const { admin_notes } = req.body;

  await transaction(async (client) => {
    // Update worker verification status
    await client.query(
      `UPDATE worker_profiles 
       SET verification_status = 'verified'
       WHERE user_id = $1`,
      [workerId]
    );

    // Update user verification status
    await client.query(
      'UPDATE users SET is_verified = true WHERE id = $1',
      [workerId]
    );

    // Create notification
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        workerId,
        'Verification Approved!',
        'Congratulations! Your profile has been verified. You can now start accepting jobs.',
        'system'
      ]
    );

    // Log admin action if notes provided
    if (admin_notes) {
      await client.query(
        `UPDATE worker_profiles 
         SET extracted_nid_data = jsonb_set(
           COALESCE(extracted_nid_data, '{}'::jsonb),
           '{admin_notes}',
           to_jsonb($1::text)
         )
         WHERE user_id = $2`,
        [admin_notes, workerId]
      );
    }
  });

  res.json({
    success: true,
    message: 'Worker verification approved'
  });
});

// @desc    Reject worker verification
// @route   PUT /api/admin/verifications/:workerId/reject
// @access  Private (Admin)
const rejectVerification = asyncHandler(async (req, res) => {
  const { workerId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a reason for rejection'
    });
  }

  await transaction(async (client) => {
    await client.query(
      `UPDATE worker_profiles 
       SET verification_status = 'rejected'
       WHERE user_id = $1`,
      [workerId]
    );

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        workerId,
        'Verification Rejected',
        `Your verification was rejected. Reason: ${reason}. Please resubmit with correct information.`,
        'system'
      ]
    );
  });

  res.json({
    success: true,
    message: 'Worker verification rejected'
  });
});

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = asyncHandler(async (req, res) => {
  const { role, is_active, search, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let queryText = 'SELECT * FROM users WHERE 1=1';
  const params = [];
  let paramCount = 0;

  if (role) {
    paramCount++;
    queryText += ` AND role = $${paramCount}`;
    params.push(role);
  }

  if (is_active !== undefined) {
    paramCount++;
    queryText += ` AND is_active = $${paramCount}`;
    params.push(is_active === 'true');
  }

  if (search) {
    paramCount++;
    queryText += ` AND (full_name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await query(queryText, params);

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Deactivate user account
// @route   PUT /api/admin/users/:userId/deactivate
// @access  Private (Admin)
const deactivateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  await transaction(async (client) => {
    await client.query(
      'UPDATE users SET is_active = false WHERE id = $1',
      [userId]
    );

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        'Account Deactivated',
        `Your account has been deactivated. Reason: ${reason || 'Violation of terms'}. Contact support for assistance.`,
        'system'
      ]
    );
  });

  res.json({
    success: true,
    message: 'User account deactivated'
  });
});

// @desc    Activate user account
// @route   PUT /api/admin/users/:userId/activate
// @access  Private (Admin)
const activateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await transaction(async (client) => {
    await client.query(
      'UPDATE users SET is_active = true WHERE id = $1',
      [userId]
    );

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        'Account Activated',
        'Your account has been reactivated. You can now use all services.',
        'system'
      ]
    );
  });

  res.json({
    success: true,
    message: 'User account activated'
  });
});

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Private (Admin)
const getReports = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let queryText = `
    SELECT 
      r.*,
      reporter.full_name as reporter_name,
      reported.full_name as reported_user_name,
      CASE 
        WHEN r.booking_id IS NOT NULL THEN b.booking_number
        ELSE NULL
      END as booking_number
    FROM reports r
    INNER JOIN users reporter ON r.reporter_id = reporter.id
    INNER JOIN users reported ON r.reported_user_id = reported.id
    LEFT JOIN bookings b ON r.booking_id = b.id
    WHERE 1=1
  `;

  const params = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    queryText += ` AND r.status = $${paramCount}`;
    params.push(status);
  }

  queryText += ` ORDER BY r.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await query(queryText, params);

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Update report status
// @route   PUT /api/admin/reports/:reportId
// @access  Private (Admin)
const updateReportStatus = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status, admin_notes } = req.body;

  if (!['investigating', 'resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status'
    });
  }

  const result = await query(
    `UPDATE reports 
     SET status = $1, 
         admin_notes = $2,
         resolved_at = CASE WHEN $1 IN ('resolved', 'dismissed') THEN CURRENT_TIMESTAMP ELSE NULL END
     WHERE id = $3
     RETURNING *`,
    [status, admin_notes, reportId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Report not found'
    });
  }

  res.json({
    success: true,
    message: 'Report updated successfully',
    data: result.rows[0]
  });
});

// @desc    Mark review as fake
// @route   PUT /api/admin/reviews/:reviewId/mark-fake
// @access  Private (Admin)
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

// @desc    Get platform statistics
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getPlatformStats = asyncHandler(async (req, res) => {
  const stats = await query(`
    SELECT 
      (SELECT COUNT(*) FROM users WHERE role = 'user') as total_users,
      (SELECT COUNT(*) FROM users WHERE role = 'worker') as total_workers,
      (SELECT COUNT(*) FROM users WHERE role = 'worker' AND is_verified = true) as verified_workers,
      (SELECT COUNT(*) FROM bookings) as total_bookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings,
      (SELECT SUM(final_price) FROM bookings WHERE payment_status = 'paid') as total_revenue,
      (SELECT COUNT(*) FROM reviews) as total_reviews,
      (SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE is_fake = false) as platform_rating,
      (SELECT COUNT(*) FROM reports WHERE status = 'pending') as pending_reports,
      (SELECT COUNT(*) FROM bookings WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as bookings_last_30_days,
      (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_last_30_days
  `);

  res.json({
    success: true,
    data: stats.rows[0]
  });
});

// @desc    Feature/Unfeature worker
// @route   PUT /api/admin/workers/:workerId/feature
// @access  Private (Admin)
const toggleFeatureWorker = asyncHandler(async (req, res) => {
  const { workerId } = req.params;
  const { is_featured } = req.body;

  await query(
    'UPDATE worker_profiles SET is_featured = $1 WHERE user_id = $2',
    [is_featured, workerId]
  );

  res.json({
    success: true,
    message: `Worker ${is_featured ? 'featured' : 'unfeatured'} successfully`
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
  toggleFeatureWorker
};