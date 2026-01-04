const { query, transaction } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { calculatePrice, calculateDistance } = require('../utils/helpers');
const { PRICING } = require('../config/constants');
const { broadcastCallRequest, notifyUser, notifyWorker } = require('../socket/socketServer');

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
    payment_method,
    slot_id // For slot-based bookings
  } = req.body;

  // Validation
  if (!worker_id || !service_description || !service_location || !booking_type) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields'
    });
  }

  if (!['instant', 'scheduled', 'call_worker'].includes(booking_type)) {
    return res.status(400).json({
      success: false,
      message: 'Booking type must be "instant", "scheduled", or "call_worker"'
    });
  }

  // If slot_id is provided, validate and use slot's date/time
  let slotDate = scheduled_date;
  let slotTime = scheduled_time;
  if (slot_id) {
    const slotCheck = await query(
      `SELECT id, worker_id, slot_date, start_time, status 
       FROM worker_slots 
       WHERE id = $1 AND status = 'active'`,
      [slot_id]
    );
    
    if (slotCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Slot not found or not available'
      });
    }
    
    const slot = slotCheck.rows[0];
    
    // Verify slot belongs to the selected worker
    if (slot.worker_id !== worker_id) {
      return res.status(400).json({
        success: false,
        message: 'Slot does not belong to the selected worker'
      });
    }
    
    slotDate = slot.slot_date;
    slotTime = slot.start_time;
  } else if (booking_type === 'scheduled' && (!scheduled_date || !scheduled_time)) {
    return res.status(400).json({
      success: false,
      message: 'Scheduled bookings require date and time, or select a slot'
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
    // If slot_id is provided, update slot status to 'booked'
    if (slot_id) {
      await client.query(
        `UPDATE worker_slots 
         SET status = 'booked', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [slot_id]
      );
    }
    
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
        distance_km,
        slot_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
        slotDate || scheduled_date || null,
        slotTime || scheduled_time || null,
        estimated_price,
        payment_method || 'cash',
        distance_km,
        slot_id || null
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
      CASE 
        WHEN b.worker_id IS NOT NULL THEN
          json_build_object(
            'id', w.id,
            'full_name', w.full_name,
            'phone', w.phone,
            'profile_photo', w.profile_photo,
            'average_rating', wp.average_rating
          )
        ELSE NULL
      END as worker,
      sc.name_en as service_category_name,
      (SELECT id FROM reviews WHERE booking_id = b.id LIMIT 1) as review_id
    FROM bookings b
    LEFT JOIN users w ON b.worker_id = w.id
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
  try {
    // Check if bookings table exists
    const bookingsTableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings'
      )`
    );

    if (!bookingsTableCheck.rows[0].exists) {
      return res.json({
        success: true,
        data: []
      });
    }

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
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error fetching worker bookings:', error);
    // Return empty array on error instead of failing
    res.json({
      success: true,
      data: []
    });
  }
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
      CASE 
        WHEN b.worker_id IS NOT NULL THEN
          json_build_object(
            'id', w.id,
            'full_name', w.full_name,
            'phone', w.phone,
            'email', w.email,
            'profile_photo', w.profile_photo,
            'address', w.address,
            'average_rating', wp.average_rating,
            'total_reviews', wp.total_reviews
          )
        ELSE NULL
      END as worker,
      sc.name_en as service_category_name
    FROM bookings b
    INNER JOIN users u ON b.user_id = u.id
    LEFT JOIN users w ON b.worker_id = w.id
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
  // For call_worker bookings, workers in the same category can view even if worker_id is null
  let isAuthorized = 
    booking.user_id === req.user.id || 
    (booking.worker_id && booking.worker_id === req.user.id) || 
    req.user.role === 'admin';
  
  // Additional check: if worker viewing a pending call_worker booking, verify same category
  if (!isAuthorized && req.user.role === 'worker' && booking.booking_type === 'call_worker' && !booking.worker_id) {
    const workerCheck = await query(
      'SELECT service_category_id FROM worker_profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (workerCheck.rows.length > 0 && workerCheck.rows[0].service_category_id === booking.service_category_id) {
      isAuthorized = true; // Same category worker can view pending call request
    }
  }
  
  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this booking'
    });
  }

  // Get booking images (handle if table doesn't exist)
  let imagesResult;
  try {
    imagesResult = await query(
      `SELECT image_url, image_order 
       FROM booking_images 
       WHERE booking_id = $1 
       ORDER BY image_order ASC`,
      [id]
    );
  } catch (error) {
    // If table doesn't exist, return empty array
    if (error.code === '42P01') {
      imagesResult = { rows: [] };
    } else {
      throw error;
    }
  }

  // Add images to booking data
  booking.image_urls = imagesResult.rows.map(row => row.image_url);

  res.json({
    success: true,
    data: booking
  });
});

// @desc    Worker accepts booking
// @route   PUT /api/bookings/:id/accept
// @access  Private (Worker only)
const acceptBooking = asyncHandler(async (req, res) => {
  // Check if worker account is active
  if (!req.user.is_active) {
    return res.status(403).json({
      success: false,
      message: 'Your account must be activated to accept bookings. Please complete NID verification and wait for admin activation.'
    });
  }
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

    // Note: Loyalty points are awarded ONLY when booking is COMPLETED AND PAID
    // Points will be awarded in payment completion logic to ensure both conditions are met

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

    // Notify user via socket
    notifyUser(booking.user_id, 'booking:rejected', {
      booking_id: id,
      worker_id: req.user.id,
      reason: reason || 'Not available'
    });

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
  // Check if worker account is active
  if (!req.user.is_active) {
    return res.status(403).json({
      success: false,
      message: 'Your account must be activated to start jobs. Please complete NID verification and wait for admin activation.'
    });
  }
  
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
  // Check if worker account is active
  if (!req.user.is_active) {
    return res.status(403).json({
      success: false,
      message: 'Your account must be activated to complete jobs. Please complete NID verification and wait for admin activation.'
    });
  }
  
  const { id } = req.params;
  const { final_price } = req.body;

  const result = await transaction(async (client) => {
    // Get booking to check type
    const bookingCheck = await client.query(
      'SELECT booking_type, estimated_price FROM bookings WHERE id = $1 AND worker_id = $2 AND status = $3',
      [id, req.user.id, 'in_progress']
    );

    if (bookingCheck.rows.length === 0) {
      throw new Error('Cannot complete this job. It may not be in progress or not assigned to you.');
    }

    const bookingData = bookingCheck.rows[0];
    
    // For all booking types (instant, scheduled, call_worker), use estimated_price as final_price
    // Price was already fixed/estimated before booking, so no need to ask worker for final price
    if (!bookingData.estimated_price) {
      throw new Error('Estimated price not set for this booking');
    }
    const finalPriceToUse = bookingData.estimated_price;
    console.log(`[CompleteJob] Booking type: ${bookingData.booking_type}, Using estimated_price ${finalPriceToUse} as final_price`);

    const updateResult = await client.query(
      `UPDATE bookings 
       SET status = 'completed', 
           final_price = $1,
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND worker_id = $3 AND status = 'in_progress'
       RETURNING *`,
      [finalPriceToUse, id, req.user.id]
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

    // Note: Loyalty points are awarded only when booking is COMPLETED AND PAID
    // Points will be awarded in payment completion logic to ensure both conditions are met

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

// @desc    Call worker (Uber-like) - Broadcast to all active workers with images
// @route   POST /api/bookings/call-worker
// @access  Private (User only)
const callWorker = asyncHandler(async (req, res) => {
  // Debug: Log request body and files
  console.log('[CallWorker] Request body:', req.body);
  console.log('[CallWorker] Request files:', req.files ? req.files.length : 0, 'files');
  console.log('[CallWorker] Cloudinary URLs:', req.cloudinaryUrls ? req.cloudinaryUrls.length : 0, 'URLs');

  const {
    service_category_id,
    service_description,
    service_location,
    location_latitude,
    location_longitude,
    payment_method,
    image_urls // Array of image URLs (from Cloudinary or base64) - fallback if files not uploaded
  } = req.body;

  // Validation - service_description is required along with images
  // Trim strings to handle whitespace-only values
  const trimmedDescription = service_description ? service_description.trim() : '';
  const trimmedLocation = service_location ? service_location.trim() : '';
  
  if (!service_category_id || !trimmedDescription || !trimmedLocation) {
    console.error('[CallWorker] Validation failed:', {
      service_category_id: service_category_id,
      service_description: service_description,
      service_location: service_location,
      service_description_type: typeof service_description,
      service_description_length: service_description ? service_description.length : 0,
      body_keys: Object.keys(req.body),
      body_values: {
        service_category_id: req.body.service_category_id,
        service_description: req.body.service_description,
        service_location: req.body.service_location
      }
    });
    return res.status(400).json({
      success: false,
      message: 'Please provide service category, description, and location'
    });
  }

  // Get images from uploaded files (Cloudinary) or from body (base64)
  let images = [];
  
  // First, try to get from uploaded files (Cloudinary URLs)
  if (req.cloudinaryUrls && req.cloudinaryUrls.length > 0) {
    images = req.cloudinaryUrls;
  } 
  // Fallback to base64 URLs from body
  else if (image_urls && Array.isArray(image_urls) && image_urls.length > 0) {
    images = image_urls;
  }
  // If files were uploaded but Cloudinary failed, convert to base64
  else if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const base64Image = file.buffer.toString('base64');
      const mimeType = file.mimetype;
      images.push(`data:${mimeType};base64,${base64Image}`);
    }
  }

  // Validate images (1-3 images required)
  if (images.length === 0 || images.length > 3) {
    return res.status(400).json({
      success: false,
      message: 'Please upload 1 to 3 images of the service problem'
    });
  }

  // Validate location coordinates if provided
  if (location_latitude !== undefined && location_latitude !== null) {
    if (isNaN(parseFloat(location_latitude)) || parseFloat(location_latitude) < -90 || parseFloat(location_latitude) > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude. Must be between -90 and 90'
      });
    }
  }

  if (location_longitude !== undefined && location_longitude !== null) {
    if (isNaN(parseFloat(location_longitude)) || parseFloat(location_longitude) < -180 || parseFloat(location_longitude) > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid longitude. Must be between -180 and 180'
      });
    }
  }

  // Check if category exists
  const categoryCheck = await query(
    'SELECT id, name_en FROM service_categories WHERE id = $1 AND is_active = true',
    [service_category_id]
  );

  if (categoryCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Service category not found'
    });
  }

  // Generate unique booking number
  const booking_number = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // Create booking without worker_id and without estimated_price (workers will bid)
  const result = await transaction(async (client) => {
    try {
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
        estimated_price,
        payment_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        booking_number,
        req.user.id,
        null, // worker_id is null initially
        service_category_id,
        'call_worker',
        'pending_estimation', // New status: waiting for worker estimates
        trimmedDescription, // Required - user provides description along with images
        trimmedLocation,
        location_latitude || null,
        location_longitude || null,
        null, // No auto-estimation, workers will bid - estimated_price stays NULL until worker selected
        payment_method || 'cash'
      ]
    );

    const booking = bookingResult.rows[0];

    // Ensure booking_images table exists before saving images
    try {
      // Try to create table if it doesn't exist (will fail silently if it exists)
      await client.query(`
        CREATE TABLE IF NOT EXISTS booking_images (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          image_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_booking_images_booking_id ON booking_images(booking_id)`);
    } catch (createError) {
      // Table might already exist, that's fine
      console.log('Note: booking_images table check:', createError.message);
    }

    // Save booking images
    try {
      for (let i = 0; i < images.length; i++) {
        await client.query(
          `INSERT INTO booking_images (booking_id, image_url, image_order)
           VALUES ($1, $2, $3)`,
          [booking.id, images[i], i]
        );
      }
    } catch (insertError) {
      // If table still doesn't exist, create it and retry
      if (insertError.code === '42P01') {
        console.log('⚠ booking_images table not found, creating it...');
        await client.query(`
          CREATE TABLE booking_images (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
            image_url TEXT NOT NULL,
            image_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_booking_images_booking_id ON booking_images(booking_id)`);
        
        // Retry inserting images
        for (let i = 0; i < images.length; i++) {
          await client.query(
            `INSERT INTO booking_images (booking_id, image_url, image_order)
             VALUES ($1, $2, $3)`,
            [booking.id, images[i], i]
          );
        }
        console.log('✓ Created booking_images table and saved images');
      } else {
        throw insertError; // Re-throw if it's a different error
      }
    }

    // Get user info for broadcast (include id for consistency)
    const userResult = await client.query(
      'SELECT id, full_name, phone, profile_photo FROM users WHERE id = $1',
      [req.user.id]
    );

    // Get booking images for broadcast (handle if table doesn't exist)
    let imagesResult;
    try {
      imagesResult = await client.query(
        'SELECT image_url FROM booking_images WHERE booking_id = $1 ORDER BY image_order',
        [booking.id]
      );
    } catch (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        imagesResult = { rows: [] };
      } else {
        throw error;
      }
    }

    // Broadcast to all active workers in this category
    const broadcastData = {
      booking_id: booking.id,
      booking_number: booking.booking_number,
      user: userResult.rows[0],
      service_category: categoryCheck.rows[0].name_en,
      service_description: trimmedDescription,
      service_location: trimmedLocation,
      location_latitude,
      location_longitude,
      image_urls: imagesResult.rows.map(row => row.image_url),
      created_at: booking.created_at
    };

    // Broadcast via socket (for online workers)
    console.log(`[CallWorker] Broadcasting to category: ${service_category_id} (type: ${typeof service_category_id})`);
    const broadcastResult = broadcastCallRequest(service_category_id, broadcastData);
    console.log(`[CallWorker] Socket broadcast result:`, broadcastResult);

    // Create job alert notifications for ALL active workers in this category (including offline ones)
    // Get all active workers in this category from database
    const activeWorkersResult = await client.query(
      `SELECT u.id, u.full_name, u.is_active, wp.availability_status, wp.verification_status, wp.service_category_id
       FROM users u
       INNER JOIN worker_profiles wp ON u.id = wp.user_id
       WHERE wp.service_category_id = $1 
         AND wp.availability_status = 'available'
         AND wp.verification_status = 'verified'
         AND u.is_active = true`,
      [service_category_id]
    );

    console.log(`[CallWorker] Query for category ${service_category_id}:`);
    console.log(`[CallWorker] Found ${activeWorkersResult.rows.length} active workers in database`);
    activeWorkersResult.rows.forEach((worker, idx) => {
      console.log(`[CallWorker] Worker ${idx + 1}: ${worker.id} (${worker.full_name})`);
    });

    // Debug: Check why other workers might not be included
    const allWorkersInCategory = await client.query(
      `SELECT u.id, u.full_name, u.is_active, wp.availability_status, wp.verification_status, wp.service_category_id
       FROM users u
       INNER JOIN worker_profiles wp ON u.id = wp.user_id
       WHERE wp.service_category_id = $1`,
      [service_category_id]
    );
    console.log(`[CallWorker] Total workers in category (all statuses): ${allWorkersInCategory.rows.length}`);
    allWorkersInCategory.rows.forEach((worker, idx) => {
      const reasons = [];
      if (!worker.is_active) reasons.push('user inactive');
      if (worker.availability_status !== 'available') reasons.push(`availability=${worker.availability_status}`);
      if (worker.verification_status !== 'verified') reasons.push(`verification=${worker.verification_status}`);
      const status = reasons.length > 0 ? `❌ (${reasons.join(', ')})` : '✅';
      console.log(`[CallWorker]   Worker ${idx + 1}: ${worker.id} (${worker.full_name}) ${status}`);
    });

    // Create notifications for each worker (like normal bookings)
    // Create both 'job_alert' (for instant call feature) and 'booking' (like normal booking) notifications
    for (const worker of activeWorkersResult.rows) {
      // Create job_alert notification (for instant call feature UI)
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          worker.id,
          'New Job Alert!',
          `New instant service request with ${images.length} image(s). Location: ${trimmedLocation}`,
          'job_alert',
          booking.id
        ]
      );

      // Also create 'booking' type notification (like normal bookings) so it appears in regular notifications
      // Include service description in message so workers can see what was requested
      const notificationMessage = trimmedDescription 
        ? `Service: ${trimmedDescription.substring(0, 100)}${trimmedDescription.length > 100 ? '...' : ''}. Location: ${trimmedLocation}. ${images.length} image(s) attached.`
        : `New instant service request. Location: ${trimmedLocation}. ${images.length} image(s) attached.`;
      
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          worker.id,
          'New Instant Call Request!',
          notificationMessage,
          'booking',
          booking.id
        ]
      );

      // Send individual socket notification to worker's personal room (like normal booking)
      // This ensures workers receive the notification even if they're not in the category room
      // Include all details so workers can see what user requested
      notifyWorker(worker.id, 'worker:call-request', {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        service_category: categoryCheck.rows[0].name_en,
        service_description: trimmedDescription,
        service_location: trimmedLocation,
        image_urls: imagesResult.rows.map(row => row.image_url),
        location_latitude,
        location_longitude,
        created_at: booking.created_at,
        // Include user details so workers can see who requested
        user: {
          id: userResult.rows[0].id,
          full_name: userResult.rows[0].full_name,
          phone: userResult.rows[0].phone,
          profile_photo: userResult.rows[0].profile_photo
        }
      });
    }

    console.log(`[CallWorker] Created ${activeWorkersResult.rows.length} job_alert and ${activeWorkersResult.rows.length} booking notifications in database`);
    console.log(`[CallWorker] Sent ${activeWorkersResult.rows.length} individual socket notifications to workers`);

    return { 
      booking, 
      broadcastResult,
      activeWorkersCount: activeWorkersResult.rows.length 
    };
    } catch (dbError) {
      // Enhanced error logging for database constraint violations
      console.error('[CallWorker] Database error:', {
        message: dbError.message,
        code: dbError.code,
        constraint: dbError.constraint,
        detail: dbError.detail,
        hint: dbError.hint,
        table: dbError.table,
        column: dbError.column,
        stack: dbError.stack
      });

      // Provide user-friendly error messages
      if (dbError.code === '23514') { // Check constraint violation
        if (dbError.constraint === 'bookings_status_check') {
          throw new Error('Database configuration error: "pending_estimation" status is not allowed. Please run the migration to update the database constraint.');
        }
        throw new Error(`Database constraint violation: ${dbError.constraint}. ${dbError.message}`);
      } else if (dbError.code === '23502') { // Not null constraint violation
        throw new Error(`Required field missing: ${dbError.column || 'unknown field'}`);
      } else if (dbError.code === '23503') { // Foreign key constraint violation
        throw new Error('Invalid reference: One of the provided IDs does not exist in the database');
      } else if (dbError.code === '23505') { // Unique constraint violation
        throw new Error('Duplicate entry: This booking number already exists');
      }
      
      // Re-throw the error with original message for other cases
      throw dbError;
    }
  });

  // Count total workers (from database query, not just socket-connected)
  const totalWorkersCount = result.activeWorkersCount || 0;
  const socketNotifiedCount = result.broadcastResult?.workerCount || 0;

  console.log(`[CallWorker] Response: Total workers in DB: ${totalWorkersCount}, Socket-connected: ${socketNotifiedCount}`);

  res.status(201).json({
    success: true,
    message: totalWorkersCount > 0 
      ? `Call request sent. ${totalWorkersCount} workers will be notified (${socketNotifiedCount} online, ${totalWorkersCount - socketNotifiedCount} offline)`
      : 'Call request created. No active workers found in this category.',
    data: {
      booking: result.booking,
      workers_notified: totalWorkersCount, // Return total workers from database, not just socket-connected
      socket_notified: socketNotifiedCount,
      total_workers: totalWorkersCount // Explicit total for clarity
    }
  });
});

// @desc    Worker accepts a call request
// @route   PUT /api/bookings/:id/accept-call
// @access  Private (Worker only)
const acceptCallRequest = asyncHandler(async (req, res) => {
  // Check if worker account is active
  if (!req.user.is_active) {
    return res.status(403).json({
      success: false,
      message: 'Your account must be activated to accept call requests. Please complete NID verification and wait for admin activation.'
    });
  }
  
  const { id } = req.params;

  const result = await transaction(async (client) => {
    // Get booking
    const bookingResult = await client.query(
      `SELECT b.*, u.full_name as user_name, u.phone as user_phone
       FROM bookings b
       INNER JOIN users u ON b.user_id = u.id
       WHERE b.id = $1 AND b.booking_type = 'call_worker' AND b.status = 'pending' AND b.worker_id IS NULL`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      throw new Error('Call request not found or already accepted');
    }

    const booking = bookingResult.rows[0];

    // Check if worker is available and in the same category
    const workerCheck = await client.query(
      `SELECT wp.service_category_id, wp.availability_status
       FROM worker_profiles wp
       WHERE wp.user_id = $1 AND wp.verification_status = 'verified'`,
      [req.user.id]
    );

    if (workerCheck.rows.length === 0) {
      throw new Error('Worker profile not found or not verified');
    }

    const worker = workerCheck.rows[0];

    if (worker.service_category_id !== booking.service_category_id) {
      throw new Error('You are not registered for this service category');
    }

    if (worker.availability_status !== 'available') {
      throw new Error('You must be available to accept call requests');
    }

    // Update booking with worker_id
    const updateResult = await client.query(
      `UPDATE bookings 
       SET worker_id = $1, status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [req.user.id, id]
    );

    // Update worker availability
    await client.query(
      `UPDATE worker_profiles 
       SET availability_status = 'busy'
       WHERE user_id = $1`,
      [req.user.id]
    );

    // Notify user
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        booking.user_id,
        'Worker Accepted Your Request!',
        'A worker has accepted your service request',
        'booking',
        id
      ]
    );

    // Notify user via socket
    notifyUser(booking.user_id, 'booking:accepted', {
      booking_id: id,
      worker_id: req.user.id
    });

    // Notify other workers in the same category that this request is no longer available
    const { getIO } = require('../socket/socketServer');
    const io = getIO();
    if (io) {
      const bookingCategory = await client.query(
        'SELECT service_category_id FROM bookings WHERE id = $1',
        [id]
      );
      if (bookingCategory.rows.length > 0) {
        io.to(`category:${bookingCategory.rows[0].service_category_id}`).emit('worker:call-request-accepted', {
          booking_id: id,
          accepted_by: req.user.id
        });
      }
    }

    // Get worker info for user notification
    const workerInfo = await client.query(
      'SELECT full_name, phone, profile_photo FROM users WHERE id = $1',
      [req.user.id]
    );

    return { booking: updateResult.rows[0], workerInfo: workerInfo.rows[0] };
  });

  res.json({
    success: true,
    message: 'Call request accepted successfully',
    data: result
  });
});

// @desc    Create scheduled booking with time slots
// @route   POST /api/bookings/scheduled-slot
// @access  Private (User only)
const createScheduledSlotBooking = asyncHandler(async (req, res) => {
  const {
    service_category_id,
    service_description,
    service_location,
    location_latitude,
    location_longitude,
    scheduled_date,
    scheduled_time,
    payment_method
  } = req.body;

  // Validation
  if (!service_category_id || !service_description || !service_location || !scheduled_date || !scheduled_time) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields including date and time'
    });
  }

  // Check if date is in the future
  const bookingDate = new Date(`${scheduled_date}T${scheduled_time}`);
  if (bookingDate <= new Date()) {
    return res.status(400).json({
      success: false,
      message: 'Scheduled date and time must be in the future'
    });
  }

  // Check if category exists
  const categoryCheck = await query(
    'SELECT id, name_en FROM service_categories WHERE id = $1 AND is_active = true',
    [service_category_id]
  );

  if (categoryCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Service category not found'
    });
  }

  // Calculate estimated price
  const estimated_price = parseFloat(process.env.BASE_SERVICE_PRICE || 200);

  // Generate unique booking number
  const booking_number = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // Create booking and scheduled slot
  const result = await transaction(async (client) => {
    // Create booking without worker_id
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
        payment_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        booking_number,
        req.user.id,
        null, // worker_id is null initially
        service_category_id,
        'scheduled',
        'pending',
        service_description,
        service_location,
        location_latitude || null,
        location_longitude || null,
        scheduled_date,
        scheduled_time,
        estimated_price,
        payment_method || 'cash'
      ]
    );

    const booking = bookingResult.rows[0];

    // Create scheduled slot
    const slotResult = await client.query(
      `INSERT INTO scheduled_slots (
        booking_id,
        scheduled_date,
        scheduled_time,
        status
      ) VALUES ($1, $2, $3, $4)
      RETURNING *`,
      [booking.id, scheduled_date, scheduled_time, 'available']
    );

    // Get user info
    const userResult = await client.query(
      'SELECT full_name, phone, profile_photo FROM users WHERE id = $1',
      [req.user.id]
    );

    // Notify all workers in this category about the available slot
    const slotData = {
      slot_id: slotResult.rows[0].id,
      booking_id: booking.id,
      booking_number: booking.booking_number,
      user: userResult.rows[0],
      service_category: categoryCheck.rows[0].name_en,
      service_description,
      service_location,
      scheduled_date,
      scheduled_time,
      estimated_price
    };

    const broadcastResult = broadcastCallRequest(service_category_id, {
      ...slotData,
      type: 'scheduled_slot'
    });

    return { booking, slot: slotResult.rows[0], broadcastResult };
  });

  res.status(201).json({
    success: true,
    message: 'Scheduled booking created. Workers will be notified.',
    data: {
      booking: result.booking,
      slot: result.slot,
      workers_notified: result.broadcastResult.workerCount || 0
    }
  });
});

// @desc    Worker accepts a scheduled slot
// @route   PUT /api/bookings/slots/:slotId/accept
// @access  Private (Worker only)
const acceptScheduledSlot = asyncHandler(async (req, res) => {
  const { slotId } = req.params;

  const result = await transaction(async (client) => {
    // Get slot with booking info
    const slotResult = await client.query(
      `SELECT ss.*, b.*, u.full_name as user_name, u.phone as user_phone
       FROM scheduled_slots ss
       INNER JOIN bookings b ON ss.booking_id = b.id
       INNER JOIN users u ON b.user_id = u.id
       WHERE ss.id = $1 AND ss.status = 'available'`,
      [slotId]
    );

    if (slotResult.rows.length === 0) {
      throw new Error('Slot not found or already accepted');
    }

    const slot = slotResult.rows[0];
    const booking = slot;

    // Check if worker is in the same category
    const workerCheck = await client.query(
      `SELECT wp.service_category_id, wp.verification_status
       FROM worker_profiles wp
       WHERE wp.user_id = $1`,
      [req.user.id]
    );

    if (workerCheck.rows.length === 0 || workerCheck.rows[0].verification_status !== 'verified') {
      throw new Error('Worker profile not found or not verified');
    }

    if (workerCheck.rows[0].service_category_id !== booking.service_category_id) {
      throw new Error('You are not registered for this service category');
    }

    // Update slot status
    await client.query(
      `UPDATE scheduled_slots 
       SET status = 'accepted', accepted_by_worker_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [req.user.id, slotId]
    );

    // Update booking with worker_id
    await client.query(
      `UPDATE bookings 
       SET worker_id = $1, status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [req.user.id, booking.booking_id]
    );

    // Notify user
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        booking.user_id,
        'Worker Accepted Your Scheduled Booking!',
        `A worker has accepted your scheduled booking for ${slot.scheduled_date} at ${slot.scheduled_time}`,
        'booking',
        booking.booking_id
      ]
    );

    // Notify user via socket
    notifyUser(booking.user_id, 'booking:scheduled-accepted', {
      booking_id: booking.booking_id,
      slot_id: slotId,
      worker_id: req.user.id
    });

    // Get worker info
    const workerInfo = await client.query(
      'SELECT full_name, phone, profile_photo FROM users WHERE id = $1',
      [req.user.id]
    );

    return { slot, booking, workerInfo: workerInfo.rows[0] };
  });

  res.json({
    success: true,
    message: 'Scheduled slot accepted successfully',
    data: result
  });
});

// @desc    Get available scheduled slots for workers
// @route   GET /api/bookings/available-slots
// @access  Private (Worker only)
const getAvailableSlots = asyncHandler(async (req, res) => {
  try {
    // Check if scheduled_slots table exists
    const slotsTableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'scheduled_slots'
      )`
    );

    if (!slotsTableCheck.rows[0].exists) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Check if bookings table exists
    const bookingsTableCheck = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings'
      )`
    );

    if (!bookingsTableCheck.rows[0].exists) {
      return res.json({
        success: true,
        data: []
      });
    }

    const { category_id, date } = req.query;

    // Get worker's category
    const workerResult = await query(
      'SELECT service_category_id FROM worker_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (workerResult.rows.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const workerCategoryId = workerResult.rows[0].service_category_id;
    const targetCategoryId = category_id || workerCategoryId;

    let queryText = `
      SELECT 
        ss.*,
        b.booking_number,
        b.service_description,
        b.service_location,
        b.location_latitude,
        b.location_longitude,
        b.estimated_price,
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'phone', u.phone,
          'profile_photo', u.profile_photo
        ) as user
      FROM scheduled_slots ss
      INNER JOIN bookings b ON ss.booking_id = b.id
      INNER JOIN users u ON b.user_id = u.id
      WHERE ss.status = 'available'
        AND b.service_category_id = $1
        AND b.booking_type = 'scheduled'
        AND b.status = 'pending'
    `;

    const params = [targetCategoryId];

    if (date) {
      queryText += ` AND ss.scheduled_date = $2`;
      params.push(date);
    } else {
      // Only show future slots
      queryText += ` AND (ss.scheduled_date > CURRENT_DATE OR (ss.scheduled_date = CURRENT_DATE AND ss.scheduled_time > CURRENT_TIME))`;
    }

    queryText += ` ORDER BY ss.scheduled_date ASC, ss.scheduled_time ASC`;

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    // Return empty array on error instead of failing
    res.json({
      success: true,
      data: []
    });
  }
});

// @desc    Estimate booking price
// @route   POST /api/bookings/estimate-price
// @access  Public (No auth required for estimation)
const estimatePrice = asyncHandler(async (req, res) => {
  const {
    service_category_id,
    booking_type = 'instant',
    location,
    date,
    time
  } = req.body;

  // Validation
  if (!service_category_id || !location || !location.latitude || !location.longitude) {
    return res.status(400).json({
      success: false,
      message: 'Service category and location (latitude, longitude) are required'
    });
  }

  // Verify service category exists
  const categoryCheck = await query(
    'SELECT id, name_en FROM service_categories WHERE id = $1 AND is_active = true',
    [service_category_id]
  );

  if (categoryCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Service category not found'
    });
  }

  // Base price from config (can be customized per category later)
  const basePrice = PRICING.BASE_PRICE || 200;
  const pricePerKm = PRICING.PRICE_PER_KM || 50;

  // Find nearest available worker in this service category
  const defaultWorkerLat = 23.8103; // Default: Dhaka city center fallback
  const defaultWorkerLng = 90.4125;
  let distanceKm = 0;
  let workerLocationUsed = 'default'; // 'worker' or 'default'
  
  try {
    // Query for nearest available worker in this category with location
    const workersQuery = `
      SELECT 
        u.latitude,
        u.longitude,
        (6371 * acos(
          cos(radians($1)) * cos(radians(u.latitude)) *
          cos(radians(u.longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(u.latitude))
        )) as distance_km
      FROM users u
      INNER JOIN worker_profiles wp ON u.id = wp.user_id
      WHERE wp.service_category_id = $3
        AND wp.verification_status = 'verified'
        AND wp.availability_status = 'available'
        AND u.is_active = true
        AND u.latitude IS NOT NULL
        AND u.longitude IS NOT NULL
      ORDER BY distance_km ASC
      LIMIT 1
    `;

    const workersResult = await query(workersQuery, [
      location.latitude,
      location.longitude,
      service_category_id
    ]);

    if (workersResult.rows.length > 0 && workersResult.rows[0].latitude) {
      // Use nearest available worker's location
      distanceKm = parseFloat(workersResult.rows[0].distance_km) || 0;
      workerLocationUsed = 'worker';
    } else {
      // Fallback to default location (Dhaka city center) if no available workers found
      distanceKm = calculateDistance(
        defaultWorkerLat,
        defaultWorkerLng,
        location.latitude,
        location.longitude
      );
      workerLocationUsed = 'default';
    }
  } catch (error) {
    // If query fails, fallback to default location calculation
    console.error('Error finding nearest worker:', error);
    distanceKm = calculateDistance(
      defaultWorkerLat,
      defaultWorkerLng,
      location.latitude,
      location.longitude
    );
    workerLocationUsed = 'default';
  }

  // Calculate distance cost
  const distanceCost = Math.round(distanceKm * pricePerKm);

  // Time-based adjustment
  let timeCharge = 0;
  if (date && time) {
    const bookingDateTime = new Date(`${date}T${time}`);
    const hour = bookingDateTime.getHours();
    
    // Evening (6 PM - 10 PM) - 30% extra
    if (hour >= 18 && hour < 22) {
      timeCharge = Math.round(basePrice * 0.30);
    }
    // Night (10 PM - 6 AM) - 50% extra
    else if (hour >= 22 || hour < 6) {
      timeCharge = Math.round(basePrice * 0.50);
    }
  }

  // Instant booking premium (only for instant bookings)
  let instantBookingFee = 0;
  if (booking_type === 'instant') {
    instantBookingFee = Math.round(basePrice * 0.40); // 40% premium for instant service
  }

  // Calculate total estimated price
  const estimatedPrice = basePrice + distanceCost + timeCharge + instantBookingFee;

  // Round to nearest 10 BDT
  const finalPrice = Math.ceil(estimatedPrice / 10) * 10;

  // Prepare breakdown
  const breakdown = {
    base_price: basePrice,
    distance_cost: distanceCost,
    time_charge: timeCharge,
    instant_booking_fee: booking_type === 'instant' ? instantBookingFee : 0
  };

  res.json({
    success: true,
    estimated_price: finalPrice,
    currency: 'BDT',
    breakdown,
    distance_km: parseFloat(distanceKm.toFixed(2)),
    worker_location_used: workerLocationUsed // 'worker' if nearest worker found, 'default' if fallback used
  });
});

// @desc    Worker submits price estimate for a call request
// @route   POST /api/bookings/:id/submit-estimate
// @access  Private (Worker only)
const submitEstimate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { estimated_price, note } = req.body;

  // Validation
  if (!estimated_price || isNaN(parseFloat(estimated_price)) || parseFloat(estimated_price) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid estimated price'
    });
  }

  // Check if worker account is active
  if (!req.user.is_active) {
    return res.status(403).json({
      success: false,
      message: 'Your account must be activated to submit estimates. Please complete NID verification and wait for admin activation.'
    });
  }

  const result = await transaction(async (client) => {
    // Get booking
    const bookingResult = await client.query(
      `SELECT b.*, u.full_name as user_name
       FROM bookings b
       INNER JOIN users u ON b.user_id = u.id
       WHERE b.id = $1 AND b.booking_type = 'call_worker' AND b.status = 'pending_estimation'`,
      [id]
    );

    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found or not accepting estimates');
    }

    const booking = bookingResult.rows[0];

    // Check if worker already submitted an estimate
    const existingEstimate = await client.query(
      'SELECT id FROM worker_estimates WHERE booking_id = $1 AND worker_id = $2',
      [id, req.user.id]
    );

    if (existingEstimate.rows.length > 0) {
      throw new Error('You have already submitted an estimate for this booking');
    }

    // Check if worker is verified and in the same category
    const workerCheck = await client.query(
      `SELECT wp.service_category_id, wp.availability_status, wp.verification_status
       FROM worker_profiles wp
       WHERE wp.user_id = $1`,
      [req.user.id]
    );

    if (workerCheck.rows.length === 0) {
      throw new Error('Worker profile not found');
    }

    const worker = workerCheck.rows[0];

    if (worker.verification_status !== 'verified') {
      throw new Error('You must be verified to submit estimates');
    }

    if (worker.service_category_id !== booking.service_category_id) {
      throw new Error('You are not registered for this service category');
    }

    if (worker.availability_status !== 'available') {
      throw new Error('You must be available to submit estimates');
    }

    // Insert worker estimate
    const estimateResult = await client.query(
      `INSERT INTO worker_estimates (booking_id, worker_id, estimated_price, note, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, req.user.id, parseFloat(estimated_price), note || null, 'pending']
    );

    const estimate = estimateResult.rows[0];

    // Get worker info for notification
    const workerInfoResult = await client.query(
      `SELECT u.full_name, u.profile_photo, wp.average_rating, wp.total_reviews
       FROM users u
       INNER JOIN worker_profiles wp ON u.id = wp.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    const workerInfo = workerInfoResult.rows[0];

    // Notify user via socket
    notifyUser(booking.user_id, 'booking:new-estimate', {
      booking_id: id,
      worker_id: req.user.id,
      worker_name: workerInfo.full_name,
      worker_photo: workerInfo.profile_photo,
      worker_rating: workerInfo.average_rating,
      worker_reviews: workerInfo.total_reviews,
      estimated_price: estimate.estimated_price,
      note: estimate.note,
      created_at: estimate.created_at
    });

    return { estimate, workerInfo };
  });

  res.status(201).json({
    success: true,
    message: 'Estimate submitted successfully',
    data: {
      estimate: result.estimate,
      worker_info: result.workerInfo
    }
  });
});

// @desc    Get estimate data for adding to cart (doesn't accept booking)
// @route   GET /api/bookings/:id/estimates/:workerId/cart-data
// @access  Private (User only)
const getEstimateCartData = asyncHandler(async (req, res) => {
  const { id, workerId } = req.params;

  // Get booking
  const bookingResult = await query(
    `SELECT * FROM bookings 
     WHERE id = $1 AND user_id = $2 AND booking_type = 'call_worker' AND status = 'pending_estimation'`,
    [id, req.user.id]
  );

  if (bookingResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found or not in pending_estimation status'
    });
  }

  const booking = bookingResult.rows[0];

  // Get worker estimate with full worker details
  const estimateResult = await query(
    `SELECT we.*, u.full_name, u.phone, u.profile_photo, wp.average_rating, wp.total_reviews, wp.service_category_id
     FROM worker_estimates we
     INNER JOIN users u ON we.worker_id = u.id
     INNER JOIN worker_profiles wp ON u.id = wp.user_id
     WHERE we.booking_id = $1 AND we.worker_id = $2 AND we.status = 'pending'`,
    [id, workerId]
  );

  if (estimateResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Worker estimate not found'
    });
  }

  const estimate = estimateResult.rows[0];

  // Return data for cart
  res.json({
    success: true,
    data: {
      booking_id: id,
      booking_number: booking.booking_number,
      worker_id: estimate.worker_id,
      worker_name: estimate.full_name,
      worker_photo: estimate.profile_photo,
      worker_phone: estimate.phone,
      service_category_id: estimate.service_category_id || booking.service_category_id,
      service_description: booking.service_description,
      service_location: booking.service_location,
      location_latitude: booking.location_latitude,
      location_longitude: booking.location_longitude,
      estimated_price: estimate.estimated_price,
      estimate_note: estimate.note,
      payment_method: booking.payment_method || 'cash',
      booking_type: 'call_worker'
    }
  });
});

// @desc    User selects a worker from estimates (accepts booking - called from checkout)
// @route   PUT /api/bookings/:id/select-worker
// @access  Private (User only)
const selectWorker = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { worker_id } = req.body;

  if (!worker_id) {
    return res.status(400).json({
      success: false,
      message: 'Please provide worker_id'
    });
  }

  const result = await transaction(async (client) => {
    // Get booking
    const bookingResult = await client.query(
      `SELECT * FROM bookings 
       WHERE id = $1 AND user_id = $2 AND booking_type = 'call_worker' AND status = 'pending_estimation'`,
      [id, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      throw new Error('Booking not found or not in pending_estimation status');
    }

    const booking = bookingResult.rows[0];

    // Check if worker estimate exists
    const estimateResult = await client.query(
      `SELECT we.*, u.full_name, u.phone, u.profile_photo, wp.average_rating, wp.total_reviews
       FROM worker_estimates we
       INNER JOIN users u ON we.worker_id = u.id
       INNER JOIN worker_profiles wp ON u.id = wp.user_id
       WHERE we.booking_id = $1 AND we.worker_id = $2 AND we.status = 'pending'`,
      [id, worker_id]
    );

    if (estimateResult.rows.length === 0) {
      throw new Error('Worker estimate not found');
    }

    const estimate = estimateResult.rows[0];

    // Update booking
    const updateBookingResult = await client.query(
      `UPDATE bookings 
       SET worker_id = $1, 
           status = 'accepted',
           estimated_price = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [worker_id, estimate.estimated_price, id]
    );

    const updatedBooking = updateBookingResult.rows[0];

    // Update selected estimate status
    await client.query(
      `UPDATE worker_estimates 
       SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [estimate.id]
    );

    // Reject all other estimates
    await client.query(
      `UPDATE worker_estimates 
       SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $1 AND worker_id != $2 AND status = 'pending'`,
      [id, worker_id]
    );

    // Update worker availability
    await client.query(
      `UPDATE worker_profiles 
       SET availability_status = 'busy'
       WHERE user_id = $1`,
      [worker_id]
    );

    // Notify selected worker
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        worker_id,
        'Your Estimate Was Selected!',
        `Your estimate for booking ${booking.booking_number} has been accepted by the user.`,
        'booking',
        id
      ]
    );

    // Notify user
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user.id,
        'Worker Selected!',
        `${estimate.full_name} has been assigned to your booking.`,
        'booking',
        id
      ]
    );

    // Notify selected worker via socket
    notifyWorker(worker_id, 'booking:worker-selected', {
      booking_id: id,
      booking_number: booking.booking_number,
      message: 'Your estimate has been accepted!'
    });

    // Notify user via socket
    notifyUser(req.user.id, 'booking:worker-selected', {
      booking_id: id,
      worker_id: worker_id,
      worker_info: {
        full_name: estimate.full_name,
        phone: estimate.phone,
        profile_photo: estimate.profile_photo,
        average_rating: estimate.average_rating,
        total_reviews: estimate.total_reviews
      }
    });

    // Notify other workers that job is closed
    const { getIO } = require('../socket/socketServer');
    const io = getIO();
    if (io) {
      io.to(`category:${booking.service_category_id}`).emit('worker:call-request-closed', {
        booking_id: id,
        message: 'This request has been assigned to another worker'
      });
    }

    return { booking: updatedBooking, estimate };
  });

  res.json({
    success: true,
    message: 'Worker selected successfully',
    data: {
      booking: result.booking,
      worker_estimate: result.estimate
    }
  });
});

// @desc    Get worker estimates for a booking
// @route   GET /api/bookings/:id/estimates
// @access  Private (User only - owner of booking)
const getBookingEstimates = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify user owns the booking
  const bookingCheck = await query(
    'SELECT id, user_id FROM bookings WHERE id = $1',
    [id]
  );

  if (bookingCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  if (bookingCheck.rows[0].user_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view estimates for this booking'
    });
  }

  // Get all estimates for this booking
  const estimatesResult = await query(
    `SELECT 
      we.id,
      we.estimated_price,
      we.note,
      we.status,
      we.created_at,
      u.id as worker_id,
      u.full_name as worker_name,
      u.profile_photo as worker_photo,
      u.phone as worker_phone,
      wp.average_rating,
      wp.total_reviews,
      wp.experience_years
     FROM worker_estimates we
     INNER JOIN users u ON we.worker_id = u.id
     INNER JOIN worker_profiles wp ON u.id = wp.user_id
     WHERE we.booking_id = $1 AND we.status = 'pending'
     ORDER BY we.created_at ASC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      estimates: estimatesResult.rows
    }
  });
});

// @desc    Get booking images
// @route   GET /api/bookings/:id/images
// @access  Private (User or Worker - must be related to booking)
const getBookingImages = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify user has access to this booking
  const bookingCheck = await query(
    `SELECT id, user_id, worker_id, booking_type 
     FROM bookings 
     WHERE id = $1`,
    [id]
  );

  if (bookingCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found'
    });
  }

  const booking = bookingCheck.rows[0];

  // Check access: user owns booking OR worker is assigned OR it's a call_worker request and worker matches category
  let hasAccess = false;
  
  if (booking.user_id === req.user.id) {
    hasAccess = true;
  } else if (booking.worker_id === req.user.id) {
    hasAccess = true;
  } else if (booking.booking_type === 'call_worker' && req.user.role === 'worker') {
    // Check if worker is in the same category
    const workerCheck = await query(
      `SELECT wp.service_category_id 
       FROM worker_profiles wp 
       WHERE wp.user_id = $1 AND wp.service_category_id = $2`,
      [req.user.id, booking.service_category_id]
    );
    hasAccess = workerCheck.rows.length > 0;
  }

  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view images for this booking'
    });
  }

  // Get booking images (handle if table doesn't exist)
  let imagesResult;
  try {
    imagesResult = await query(
      `SELECT image_url, image_order 
       FROM booking_images 
       WHERE booking_id = $1 
       ORDER BY image_order ASC`,
      [id]
    );
  } catch (error) {
    // If table doesn't exist, return empty array
    if (error.code === '42P01') {
      imagesResult = { rows: [] };
    } else {
      throw error;
    }
  }

  res.json({
    success: true,
    data: {
      images: imagesResult.rows.map(row => row.image_url)
    }
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
  cancelBooking,
  callWorker,
  acceptCallRequest,
  createScheduledSlotBooking,
  acceptScheduledSlot,
  getAvailableSlots,
  estimatePrice,
  submitEstimate,
  getEstimateCartData,
  selectWorker,
  getBookingEstimates,
  getBookingImages
};