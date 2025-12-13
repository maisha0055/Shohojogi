const { query, transaction } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { calculatePrice, calculateDistance } = require('../utils/helpers');

// @desc    Create new booking (Instant or Scheduled)
// @route   POST /api/bookings
// @access  Private (User only)
const createBooking = asyncHandler(async (req, res) => {
  const {
    worker_id,
    service_category_id,
    booking_type, // 'instant' or 'scheduled'
    service_description,
    service_location,
    location_latitude,
    location_longitude,
    scheduled_date,
    scheduled_time,
    payment_method
  } = req.body;

  // Validation
  if (!worker_id || !service_description || !service_location || !booking_type) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields'
    });
  }

  if (!['instant', 'scheduled'].includes(booking_type)) {
    return res.status(400).json({
      success: false,
      message: 'Booking type must be either "instant" or "scheduled"'
    });
  }

  if (booking_type === 'scheduled' && (!scheduled_date || !scheduled_time)) {
    return res.status(400).json({
      success: false,
      message: 'Scheduled bookings require date and time'
    });
  }

  // Check if worker exists and is available
  const workerCheck = await query(
    `SELECT u.id, u.latitude, u.longitude, wp.availability_status, wp.verification_status
     FROM users u
     INNER JOIN worker_profiles wp ON u.id = wp.user_id
     WHERE u.id = $1 AND u.role = 'worker' AND u.is_active = true`,
    [worker_id]
  );

  if (workerCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Worker not found'
    });
  }

  const worker = workerCheck.rows[0];

  if (worker.verification_status !== 'verified') {
    return res.status(400).json({
      success: false,
      message: 'This worker is not verified yet'
    });
  }

  // For instant bookings, check availability
  if (booking_type === 'instant' && worker.availability_status !== 'available') {
    return res.status(400).json({
      success: false,
      message: 'Worker is currently not available. Try scheduled booking instead.'
    });
  }

  // Calculate distance and estimated price
  let distance_km = 0;
  let estimated_price = parseFloat(process.env.BASE_SERVICE_PRICE || 200);

  if (location_latitude && location_longitude && worker.latitude && worker.longitude) {
    distance_km = calculateDistance(
      worker.latitude,
      worker.longitude,
      location_latitude,
      location_longitude
    );
    estimated_price = calculatePrice(distance_km, service_category_id);
  }

  // Generate unique booking number
  const booking_number = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // Create booking
  const result = await transaction(async (client) => {
    const bookingResult = await client.query(
      `INSERT INTO bookings (
        booking_number,
        user_id,
        worker_id,
        service_category_id,
        booking_type,
        status,
        service_description,
        service_location,
        location_latitude,
        location_longitude,
        scheduled_date,
        scheduled_time,
        estimated_price,
        payment_method,
        distance_km
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        booking_number,
        req.user.id,
        worker_id,
        service_category_id,
        booking_type,
        'pending',
        service_description,
        service_location,
        location_latitude,
        location_longitude,
        scheduled_date || null,
        scheduled_time || null,
        estimated_price,
        payment_method || 'cash',
        distance_km
      ]
    );

    // Create notification for worker
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        worker_id,
        booking_type === 'instant' ? 'New Instant Job Request!' : 'New Scheduled Job Request',
        `You have a new ${booking_type} booking request for ${service_description}`,
        'booking',
        bookingResult.rows[0].id
      ]
    );

    return bookingResult.rows[0];
  });

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: result
  });
});

// @desc    Get user's bookings
// @route   GET /api/bookings/my-bookings
// @access  Private (User)
const getUserBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  let queryText = `
    SELECT 
      b.*,
      json_build_object(
        'id', w.id,
        'full_name', w.full_name,
        'phone', w.phone,
        'profile_photo', w.profile_photo,
        'average_rating', wp.average_rating
      ) as worker,
      sc.name_en as service_category_name
    FROM bookings b
    INNER JOIN users w ON b.worker_id = w.id
    LEFT JOIN worker_profiles wp ON w.id = wp.user_id
    LEFT JOIN service_categories sc ON b.service_category_id = sc.id
    WHERE b.user_id = $1
  `;

  const params = [req.user.id];
  let paramCount = 1;

  if (status) {
    paramCount++;
    queryText += ` AND b.status = $${paramCount}`;
    params.push(status);
  }

  queryText += ` ORDER BY b.created_at DESC`;

  // Pagination
  const offset = (page - 1) * limit;
  paramCount++;
  queryText += ` LIMIT $${paramCount}`;
  params.push(limit);
  
  paramCount++;
  queryText += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await query(queryText, params);

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Get worker's bookings
// @route   GET /api/bookings/worker-bookings
// @access  Private (Worker)
const getWorkerBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  let queryText = `
    SELECT 
      b.*,
      json_build_object(
        'id', u.id,
        'full_name', u.full_name,
        'phone', u.phone,
        'profile_photo', u.profile_photo
      ) as user,
      sc.name_en as service_category_name
    FROM bookings b
    INNER JOIN users u ON b.user_id = u.id
    LEFT JOIN service_categories sc ON b.service_category_id = sc.id
    WHERE b.worker_id = $1
  `;

  const params = [req.user.id];
  let paramCount = 1;

  if (status) {
    paramCount++;
    queryText += ` AND b.status = $${paramCount}`;
    params.push(status);
  }

  queryText += ` ORDER BY b.created_at DESC`;

  const offset = (page - 1) * limit;
  paramCount++;
  queryText += ` LIMIT $${paramCount}`;
  params.push(limit);
  
  paramCount++;
  queryText += ` OFFSET $${paramCount}`;
  params.push(offset);

  const result = await query(queryText, params);

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Get single booking details
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT 
      b.*,
      json_build_object(
        'id', u.id,
        'full_name', u.full_name,
        'phone', u.phone,
        'email', u.email,
        'profile_photo', u.profile_photo,
        'address', u.address
      ) as user,
      json_build_object(
        'id', w.id,
        'full_name', w.full_name,
        'phone', w.phone,
        'email', w.email,
        'profile_photo', w.profile_photo,
        'address', w.address,
        'average_rating', wp.average_rating,
        'total_reviews', wp.total_reviews
      ) as worker,
      sc.name_en as service_category_name
    FROM bookings b
    INNER JOIN users u ON b.user_id = u.id
    INNER JOIN users w ON b.worker_id = w.id
    LEFT JOIN worker_profiles wp ON w.id = wp.user_id
    LEFT JOIN service_categories sc ON b.service_category_id = sc.id
    WHERE b.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  const booking = result.rows[0];

  // Check authorization
  if (booking.user_id !== req.user.id && booking.worker_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this booking'
    });
  }

  res.json({
    success: true,
    data: booking
  });
});

// @desc    Worker accepts booking
// @route   PUT /api/bookings/:id/accept
// @access  Private (Worker only)
const acceptBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await transaction(async (client) => {
    // Get booking
    const bookingResult = await client.query(
      'SELECT * FROM bookings WHERE id = $1 AND worker_id = $2',
      [id, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found or not assigned to you');
    }

    const booking = bookingResult.rows[0];

    if (booking.status !== 'pending') {
      throw new Error('This booking has already been processed');
    }

    // Update booking status
    const updateResult = await client.query(
      `UPDATE bookings 
       SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Update worker availability if instant booking
    if (booking.booking_type === 'instant') {
      await client.query(
        `UPDATE worker_profiles 
         SET availability_status = 'busy'
         WHERE user_id = $1`,
        [req.user.id]
      );
    }

    // Notify user
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        booking.user_id,
        'Booking Accepted!',
        'Your booking has been accepted by the worker',
        'booking',
        id
      ]
    );

    // Add loyalty points to user
    await client.query(
      `INSERT INTO loyalty_points_history (user_id, booking_id, points_earned, description)
       VALUES ($1, $2, $3, $4)`,
      [booking.user_id, id, 10, 'Booking accepted']
    );

    await client.query(
      `UPDATE users SET loyalty_points = loyalty_points + 10 WHERE id = $1`,
      [booking.user_id]
    );

    return updateResult.rows[0];
  });

  res.json({
    success: true,
    message: 'Booking accepted successfully',
    data: result
  });
});

// @desc    Worker rejects booking
// @route   PUT /api/bookings/:id/reject
// @access  Private (Worker only)
const rejectBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const result = await transaction(async (client) => {
    const bookingResult = await client.query(
      'SELECT * FROM bookings WHERE id = $1 AND worker_id = $2',
      [id, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found or not assigned to you');
    }

    const booking = bookingResult.rows[0];

    if (booking.status !== 'pending') {
      throw new Error('This booking has already been processed');
    }

    // Update booking
    const updateResult = await client.query(
      `UPDATE bookings 
       SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Notify user
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        booking.user_id,
        'Booking Rejected',
        `Your booking was rejected. Reason: ${reason || 'Not available'}`,
        'booking',
        id
      ]
    );

    return updateResult.rows[0];
  });

  res.json({
    success: true,
    message: 'Booking rejected',
    data: result
  });
});

// @desc    Start job (Worker marks as in progress)
// @route   PUT /api/bookings/:id/start
// @access  Private (Worker only)
const startJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `UPDATE bookings 
     SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND worker_id = $2 AND status = 'accepted'
     RETURNING *`,
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot start this job. It may not be accepted yet.'
    });
  }

  // Notify user
  await query(
    `INSERT INTO notifications (user_id, title, message, type, reference_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      result.rows[0].user_id,
      'Job Started',
      'The worker has started working on your job',
      'booking',
      id
    ]
  );

  res.json({
    success: true,
    message: 'Job started',
    data: result.rows[0]
  });
});

// @desc    Complete job
// @route   PUT /api/bookings/:id/complete
// @access  Private (Worker only)
const completeJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { final_price } = req.body;

  const result = await transaction(async (client) => {
    const updateResult = await client.query(
      `UPDATE bookings 
       SET status = 'completed', 
           final_price = $1,
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND worker_id = $3 AND status = 'in_progress'
       RETURNING *`,
      [final_price, id, req.user.id]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('Cannot complete this job');
    }

    const booking = updateResult.rows[0];

    // Update worker availability
    await client.query(
      `UPDATE worker_profiles 
       SET availability_status = 'available'
       WHERE user_id = $1`,
      [req.user.id]
    );

    // Award loyalty points
    const points = Math.floor(final_price / 100); // 1 point per 100 taka
    await client.query(
      `INSERT INTO loyalty_points_history (user_id, booking_id, points_earned, description)
       VALUES ($1, $2, $3, $4)`,
      [booking.user_id, id, points, 'Job completed']
    );

    await client.query(
      `UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2`,
      [points, booking.user_id]
    );

    // Notify user
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        booking.user_id,
        'Job Completed!',
        'Your job has been completed. Please leave a review.',
        'booking',
        id
      ]
    );

    return updateResult.rows[0];
  });

  res.json({
    success: true,
    message: 'Job completed successfully',
    data: result
  });
});

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const bookingResult = await query(
    'SELECT * FROM bookings WHERE id = $1',
    [id]
  );

  if (bookingResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  const booking = bookingResult.rows[0];

  // Check authorization
  if (booking.user_id !== req.user.id && booking.worker_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this booking'
    });
  }

  // Can't cancel completed bookings
  if (booking.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel completed bookings'
    });
  }

  await transaction(async (client) => {
    await client.query(
      `UPDATE bookings 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // Notify the other party
    const notifyUserId = req.user.id === booking.user_id ? booking.worker_id : booking.user_id;
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        notifyUserId,
        'Booking Cancelled',
        `A booking has been cancelled. Reason: ${reason || 'No reason provided'}`,
        'booking',
        id
      ]
    );
  });

  res.json({
    success: true,
    message: 'Booking cancelled successfully'
  });
});

module.exports = {
  createBooking,
  getUserBookings,
  getWorkerBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  startJob,
  completeJob,
  cancelBooking
};