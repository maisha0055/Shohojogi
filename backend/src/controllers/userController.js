const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  console.log('[User Profile Update] Request received for user:', req.user.id);
  console.log('[User Profile Update] Request body:', req.body);
  
  const {
    full_name,
    phone,
    address,
    latitude,
    longitude,
    preferred_language
  } = req.body;

  const updateFields = [];
  const values = [];
  let paramCount = 0;

  if (full_name) {
    paramCount++;
    updateFields.push(`full_name = $${paramCount}`);
    values.push(full_name);
  }

  if (phone) {
    paramCount++;
    updateFields.push(`phone = $${paramCount}`);
    values.push(phone);
  }

  if (address) {
    paramCount++;
    updateFields.push(`address = $${paramCount}`);
    values.push(address);
  }

  if (latitude) {
    paramCount++;
    updateFields.push(`latitude = $${paramCount}`);
    values.push(latitude);
  }

  if (longitude) {
    paramCount++;
    updateFields.push(`longitude = $${paramCount}`);
    values.push(longitude);
  }

  if (preferred_language) {
    paramCount++;
    updateFields.push(`preferred_language = $${paramCount}`);
    values.push(preferred_language);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No fields to update'
    });
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  paramCount++;
  values.push(req.user.id);

  console.log('[User Profile Update] Update query:', {
    fields: updateFields,
    values: values
  });

  const result = await query(
    `UPDATE users 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramCount}
     RETURNING id, email, full_name, phone, profile_photo, address, latitude, longitude, preferred_language, loyalty_points`,
    values
  );

  console.log('[User Profile Update] Updated successfully:', result.rows[0]);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: result.rows[0]
  });
});

// @desc    Upload profile photo
// @route   PUT /api/users/profile-photo
// @access  Private
const uploadProfilePhoto = asyncHandler(async (req, res) => {
  const { profile_photo_url } = req.body;

  if (!profile_photo_url) {
    return res.status(400).json({
      success: false,
      message: 'Profile photo URL is required'
    });
  }

  try {
    await query(
      `UPDATE users 
       SET profile_photo = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [profile_photo_url, req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile photo updated',
      data: { profile_photo: profile_photo_url }
    });
  } catch (error) {
    // Check if it's a database constraint error (like VARCHAR length limit)
    if (error.code === '22001' || 
        error.message?.includes('value too long') || 
        error.message?.includes('character varying') ||
        error.message?.includes('VARCHAR')) {
      console.error('[User Profile Photo] Database column length error detected.');
      return res.status(400).json({
        success: false,
        message: 'Profile photo URL is too long. The database column needs to be migrated. Please restart the server to run the automatic migration, or contact the administrator.',
        error: 'Database column type mismatch. Expected TEXT, but column is still VARCHAR(500).'
      });
    }
    throw error; // Re-throw to be handled by asyncHandler
  }
});

// @desc    Get user dashboard stats
// @route   GET /api/users/dashboard
// @access  Private
const getDashboard = asyncHandler(async (req, res) => {
  if (req.user.role === 'user') {
    // User dashboard
    const stats = await query(
      `SELECT 
        (SELECT COUNT(*) FROM bookings WHERE user_id = $1) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE user_id = $1 AND status = 'pending') as pending_bookings,
        (SELECT COUNT(*) FROM bookings WHERE user_id = $1 AND status = 'in_progress') as active_bookings,
        (SELECT COUNT(*) FROM bookings WHERE user_id = $1 AND status = 'completed') as completed_bookings,
        (SELECT COUNT(*) FROM favorites WHERE user_id = $1) as favorite_workers,
        (SELECT loyalty_points FROM users WHERE id = $1) as loyalty_points,
        (SELECT SUM(final_price) FROM bookings WHERE user_id = $1 AND payment_status = 'paid') as total_spent`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: stats.rows[0]
    });
  } else if (req.user.role === 'worker') {
    // Worker dashboard
    const stats = await query(
      `SELECT 
        wp.total_jobs_completed,
        wp.average_rating,
        wp.total_reviews,
        (SELECT COUNT(*) FROM bookings WHERE worker_id = $1 AND status = 'pending') as pending_requests,
        (SELECT COUNT(*) FROM bookings WHERE worker_id = $1 AND status = 'in_progress') as active_jobs,
        (SELECT SUM(final_price) FROM bookings WHERE worker_id = $1 AND payment_status = 'paid') as total_earnings,
        (SELECT COUNT(*) FROM bookings WHERE worker_id = $1 AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE)) as bookings_this_month
      FROM worker_profiles wp
      WHERE wp.user_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: stats.rows[0]
    });
  } else {
    res.status(403).json({
      success: false,
      message: 'Invalid user role'
    });
  }
});

// @desc    Add worker to favorites
// @route   POST /api/users/favorites/:workerId
// @access  Private (User)
const addFavorite = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  // Check if worker exists
  const workerCheck = await query(
    'SELECT id FROM users WHERE id = $1 AND role = $2',
    [workerId, 'worker']
  );

  if (workerCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Worker not found'
    });
  }

  // Check if already in favorites
  const existingFavorite = await query(
    'SELECT id FROM favorites WHERE user_id = $1 AND worker_id = $2',
    [req.user.id, workerId]
  );

  if (existingFavorite.rows.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Worker already in favorites'
    });
  }

  await query(
    'INSERT INTO favorites (user_id, worker_id) VALUES ($1, $2)',
    [req.user.id, workerId]
  );

  res.json({
    success: true,
    message: 'Worker added to favorites'
  });
});

// @desc    Remove worker from favorites
// @route   DELETE /api/users/favorites/:workerId
// @access  Private (User)
const removeFavorite = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  const result = await query(
    'DELETE FROM favorites WHERE user_id = $1 AND worker_id = $2 RETURNING *',
    [req.user.id, workerId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Favorite not found'
    });
  }

  res.json({
    success: true,
    message: 'Worker removed from favorites'
  });
});

// @desc    Get user's favorite workers
// @route   GET /api/users/favorites
// @access  Private (User)
const getFavorites = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT 
      u.id,
      u.full_name,
      u.phone,
      u.profile_photo,
      u.address,
      wp.hourly_rate,
      wp.average_rating,
      wp.total_reviews,
      wp.availability_status,
      sc.name_en as service_category
    FROM favorites f
    INNER JOIN users u ON f.worker_id = u.id
    INNER JOIN worker_profiles wp ON u.id = wp.user_id
    LEFT JOIN service_categories sc ON wp.service_category_id = sc.id
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Get notifications
// @route   GET /api/users/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, is_read, exclude_type } = req.query;
  const offset = (page - 1) * limit;

  let queryText = `
    SELECT * FROM notifications 
    WHERE user_id = $1
  `;

  const params = [req.user.id];
  let paramCount = 1;

  // Exclude job alerts and call_worker notifications from regular notifications
  if (exclude_type) {
    paramCount++;
    queryText += ` AND type != $${paramCount}`;
    params.push(exclude_type);
  } else {
    // Default: exclude job_alert and call_worker types
    queryText += ` AND type != 'job_alert' AND type != 'call_worker'`;
  }

  if (is_read !== undefined) {
    paramCount++;
    queryText += ` AND is_read = $${paramCount}`;
    params.push(is_read === 'true');
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await query(queryText, params);

  // Get unread count (excluding job alerts)
  let unreadQuery = `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false AND type != 'job_alert' AND type != 'call_worker'`;
  const unreadResult = await query(unreadQuery, [req.user.id]);

  res.json({
    success: true,
    data: {
      notifications: result.rows,
      unread_count: parseInt(unreadResult.rows[0].count)
    }
  });
});

// @desc    Get job alerts (for workers - instant call requests)
// @route   GET /api/users/job-alerts
// @access  Private (Worker only)
const getJobAlerts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  // Only workers can access job alerts
  if (req.user.role !== 'worker') {
    return res.status(403).json({
      success: false,
      message: 'Only workers can access job alerts'
    });
  }

  const result = await query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 AND (type = 'job_alert' OR type = 'call_worker')
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [req.user.id, limit, offset]
  );

  // Get unread count for job alerts
  const unreadResult = await query(
    `SELECT COUNT(*) FROM notifications 
     WHERE user_id = $1 AND is_read = false AND (type = 'job_alert' OR type = 'call_worker')`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: {
      alerts: result.rows,
      unread_count: parseInt(unreadResult.rows[0].count)
    }
  });
});

// @desc    Mark job alert as read
// @route   PUT /api/users/job-alerts/:id/read
// @access  Private (Worker only)
const markJobAlertRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'worker') {
    return res.status(403).json({
      success: false,
      message: 'Only workers can mark job alerts as read'
    });
  }

  await query(
    `UPDATE notifications 
     SET is_read = true 
     WHERE id = $1 AND user_id = $2 AND (type = 'job_alert' OR type = 'call_worker')`,
    [id, req.user.id]
  );

  res.json({
    success: true,
    message: 'Job alert marked as read'
  });
});

// @desc    Mark all job alerts as read
// @route   PUT /api/users/job-alerts/read-all
// @access  Private (Worker only)
const markAllJobAlertsRead = asyncHandler(async (req, res) => {
  if (req.user.role !== 'worker') {
    return res.status(403).json({
      success: false,
      message: 'Only workers can mark job alerts as read'
    });
  }

  await query(
    `UPDATE notifications 
     SET is_read = true 
     WHERE user_id = $1 AND is_read = false AND (type = 'job_alert' OR type = 'call_worker')`,
    [req.user.id]
  );

  res.json({
    success: true,
    message: 'All job alerts marked as read'
  });
});

// @desc    Mark notification as read
// @route   PUT /api/users/notifications/:id/read
// @access  Private
const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await query(
    'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
    [id, req.user.id]
  );

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/users/notifications/read-all
// @access  Private
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await query(
    'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
    [req.user.id]
  );

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// @desc    Get loyalty points history
// @route   GET /api/users/loyalty-points
// @access  Private
const getLoyaltyPoints = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT 
      lph.*,
      b.booking_number,
      b.service_description
    FROM loyalty_points_history lph
    LEFT JOIN bookings b ON lph.booking_id = b.id
    WHERE lph.user_id = $1
    ORDER BY lph.created_at DESC
    LIMIT 50`,
    [req.user.id]
  );

  // Get total points
  const totalResult = await query(
    'SELECT loyalty_points FROM users WHERE id = $1',
    [req.user.id]
  );

  res.json({
    success: true,
    data: {
      total_points: totalResult.rows[0].loyalty_points,
      history: result.rows
    }
  });
});

module.exports = {
  updateProfile,
  uploadProfilePhoto,
  getDashboard,
  addFavorite,
  removeFavorite,
  getFavorites,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getJobAlerts,
  markJobAlertRead,
  markAllJobAlertsRead,
  getLoyaltyPoints
};