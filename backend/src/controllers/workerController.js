const { query, transaction } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { extractNIDData, compareNIDData } = require('../services/ocrService');

// @desc    Get all workers with filters
// @route   GET /api/workers
// @access  Public
const getWorkers = asyncHandler(async (req, res) => {
  const {
    service_category_id,
    latitude,
    longitude,
    radius = 10, // km
    min_rating,
    availability_status,
    search,
    page = 1,
    limit = 20
  } = req.query;

  let queryText = `
    SELECT 
      u.id,
      u.full_name,
      u.phone,
      u.profile_photo,
      u.address,
      u.latitude,
      u.longitude,
      wp.experience_years,
      wp.hourly_rate,
      wp.bio,
      wp.skills,
      wp.availability_status,
      wp.verification_status,
      wp.average_rating,
      wp.total_reviews,
      wp.total_jobs_completed,
      wp.is_featured,
      sc.name_en as service_category_name,
      sc.name_bn as service_category_name_bn
  `;

  // Add distance calculation if location provided
  if (latitude && longitude) {
    queryText += `,
      (6371 * acos(
        cos(radians($1)) * cos(radians(u.latitude)) *
        cos(radians(u.longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(u.latitude))
      )) as distance_km
    `;
  }

  queryText += `
    FROM users u
    INNER JOIN worker_profiles wp ON u.id = wp.user_id
    LEFT JOIN service_categories sc ON wp.service_category_id = sc.id
    WHERE u.role = 'worker' 
      AND u.is_active = true
  `;

  const params = [];
  let paramCount = latitude && longitude ? 2 : 0;

  // Add filters
  if (service_category_id) {
    paramCount++;
    queryText += ` AND wp.service_category_id = $${paramCount}`;
    params.push(service_category_id);
  }

  if (availability_status) {
    paramCount++;
    queryText += ` AND wp.availability_status = $${paramCount}`;
    params.push(availability_status);
  }

  if (min_rating) {
    paramCount++;
    queryText += ` AND wp.average_rating >= $${paramCount}`;
    params.push(min_rating);
  }

  if (search) {
    paramCount++;
    queryText += ` AND (u.full_name ILIKE $${paramCount} OR wp.bio ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  // Add distance filter if location provided
  if (latitude && longitude) {
    queryText += ` HAVING distance_km <= ${radius}`;
  }

  // Add sorting
  queryText += latitude && longitude 
    ? ` ORDER BY distance_km ASC, wp.average_rating DESC, wp.is_featured DESC`
    : ` ORDER BY wp.is_featured DESC, wp.average_rating DESC, wp.total_reviews DESC`;

  // Add pagination
  const offset = (page - 1) * limit;
  paramCount++;
  queryText += ` LIMIT $${paramCount}`;
  params.push(limit);
  
  paramCount++;
  queryText += ` OFFSET $${paramCount}`;
  params.push(offset);

  // Prepare parameters array
  const finalParams = latitude && longitude 
    ? [latitude, longitude, ...params]
    : params;

  const result = await query(queryText, finalParams);

  // Get total count for pagination
  let countQuery = `
    SELECT COUNT(*) FROM users u
    INNER JOIN worker_profiles wp ON u.id = wp.user_id
    WHERE u.role = 'worker' 
      AND u.is_active = true
  `;

  const countParams = [];
  let countParamIndex = 0;

  if (service_category_id) {
    countParamIndex++;
    countQuery += ` AND wp.service_category_id = $${countParamIndex}`;
    countParams.push(service_category_id);
  }

  if (availability_status) {
    countParamIndex++;
    countQuery += ` AND wp.availability_status = $${countParamIndex}`;
    countParams.push(availability_status);
  }

  if (min_rating) {
    countParamIndex++;
    countQuery += ` AND wp.average_rating >= $${countParamIndex}`;
    countParams.push(min_rating);
  }

  if (search) {
    countParamIndex++;
    countQuery += ` AND (u.full_name ILIKE $${countParamIndex} OR wp.bio ILIKE $${countParamIndex})`;
    countParams.push(`%${search}%`);
  }

  const countResult = await query(countQuery, countParams);
  const totalWorkers = parseInt(countResult.rows[0].count);

  res.json({
    success: true,
    data: {
      workers: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalWorkers / limit),
        totalWorkers,
        hasMore: offset + result.rows.length < totalWorkers
      }
    }
  });
});

// @desc    Get single worker details
// @route   GET /api/workers/:id
// @access  Public
const getWorkerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const queryText = `SELECT 
      u.id,
      u.email,
      u.full_name,
      u.phone,
      u.profile_photo,
      u.address,
      u.latitude,
      u.longitude,
      u.created_at,
      wp.id as worker_profile_id,
      wp.service_category_id,
      wp.experience_years,
      wp.hourly_rate,
      wp.bio,
      wp.skills,
      wp.availability_status,
      wp.verification_status,
      wp.nid_number,
      wp.nid_image_url,
      wp.extracted_nid_data,
      wp.average_rating,
      wp.total_reviews,
      wp.total_jobs_completed,
      wp.is_featured,
      wp.created_at as profile_created_at,
      wp.updated_at as profile_updated_at,
      sc.name_en as service_category_name,
      sc.name_bn as service_category_name_bn,
      (
        SELECT COALESCE(json_agg(review_obj), '[]'::json)
        FROM (
          SELECT 
            json_build_object(
              'id', r.id,
              'rating', r.rating,
              'comment', r.comment,
              'user_name', usr.full_name,
              'user_photo', usr.profile_photo,
              'created_at', r.created_at
            ) as review_obj
          FROM reviews r
          INNER JOIN users usr ON r.user_id = usr.id
          WHERE r.worker_id = u.id AND r.is_fake = false
          ORDER BY r.created_at DESC
          LIMIT 10
        ) subq
      ) as recent_reviews
    FROM users u
    INNER JOIN worker_profiles wp ON u.id = wp.user_id
    LEFT JOIN service_categories sc ON wp.service_category_id = sc.id
    WHERE u.id = $1 AND u.role = 'worker' AND u.is_active = true`;

  const result = await query(queryText, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Worker not found'
    });
  }

  const worker = result.rows[0];

  res.json({
    success: true,
    data: worker
  });
});

// @desc    Update worker profile
// @route   PUT /api/workers/profile
// @access  Private (Worker only)
const updateWorkerProfile = asyncHandler(async (req, res) => {
  console.log('[Worker Profile Update] Request received for worker:', req.user.id);
  console.log('[Worker Profile Update] Request body:', req.body);
  console.log('[Worker Profile Update] Has file:', !!req.file);
  console.log('[Worker Profile Update] Cloudinary URL:', req.cloudinaryUrl);
  
  const {
    service_category_id,
    experience_years,
    hourly_rate,
    bio,
    skills,
    address,
    latitude,
    longitude
  } = req.body;

  // Parse numeric fields from FormData (they come as strings)
  // Handle empty strings as undefined
  // service_category_id is a UUID, not an integer, so don't parse it
  const parsedServiceCategoryId = service_category_id && service_category_id !== '' 
    ? service_category_id 
    : undefined;
  const parsedExperienceYears = experience_years !== undefined && experience_years !== '' && experience_years !== null
    ? parseInt(experience_years) 
    : undefined;
  const parsedHourlyRate = hourly_rate !== undefined && hourly_rate !== '' && hourly_rate !== null
    ? parseFloat(hourly_rate) 
    : undefined;
  
  // Handle bio - empty string should be allowed
  const parsedBio = bio !== undefined ? (bio === '' ? null : bio) : undefined;

  // Parse skills - handle JSON string from FormData or comma-separated string
  let parsedSkills = undefined;
  if (skills !== undefined && skills !== null && skills !== '') {
    if (typeof skills === 'string') {
      // Try to parse as JSON array first (from FormData)
      if (skills.trim().startsWith('[')) {
        try {
          parsedSkills = JSON.parse(skills);
          // Ensure it's an array after parsing
          if (!Array.isArray(parsedSkills)) {
            parsedSkills = [parsedSkills];
          }
        } catch (e) {
          // If JSON parsing fails, treat as comma-separated string
          parsedSkills = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
      } else {
        // Comma-separated string
        parsedSkills = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
    } else if (Array.isArray(skills)) {
      // Already an array
      parsedSkills = skills;
    }
  }

  // Verify user is a worker
  if (req.user.role !== 'worker') {
    console.log('[Worker Profile Update] Access denied - user is not a worker');
    return res.status(403).json({
      success: false,
      message: 'Only workers can update worker profiles'
    });
  }

  // Get profile photo URL from Cloudinary upload or request body
  const profilePhotoUrl = req.cloudinaryUrl || req.body.profile_photo_url;
  
  // Validate profile photo URL length if provided
  // Database column should be TEXT type (migrated automatically on server start)
  // But we'll add a safeguard here in case migration hasn't run yet
  if (profilePhotoUrl && profilePhotoUrl.length > 500) {
    // Check if it's a base64 data URL (which can be very long)
    if (profilePhotoUrl.startsWith('data:')) {
      console.warn('[Worker Profile Update] Base64 image URL is very long (' + profilePhotoUrl.length + ' chars). Consider configuring Cloudinary.');
      // If Cloudinary is not configured, we should still allow it if column is TEXT
      // But warn the user
    }
    // Note: If database column is still VARCHAR(500), this will fail
    // The migration should run automatically on server start to fix this
  }

  try {
    await transaction(async (client) => {
      // Update user basic info including profile photo
      if (address || latitude || longitude || profilePhotoUrl) {
        const updateUserFields = [];
        const userValues = [];
        let userParamCount = 0;

        if (address !== undefined) {
          userParamCount++;
          updateUserFields.push(`address = COALESCE($${userParamCount}, address)`);
          userValues.push(address);
        }

        if (latitude !== undefined) {
          userParamCount++;
          updateUserFields.push(`latitude = COALESCE($${userParamCount}, latitude)`);
          userValues.push(latitude);
        }

        if (longitude !== undefined) {
          userParamCount++;
          updateUserFields.push(`longitude = COALESCE($${userParamCount}, longitude)`);
          userValues.push(longitude);
        }

        if (profilePhotoUrl) {
          userParamCount++;
          updateUserFields.push(`profile_photo = $${userParamCount}`);
          userValues.push(profilePhotoUrl);
        }

        if (updateUserFields.length > 0) {
          updateUserFields.push(`updated_at = CURRENT_TIMESTAMP`);
          userParamCount++;
          userValues.push(req.user.id);

          await client.query(
            `UPDATE users 
             SET ${updateUserFields.join(', ')}
             WHERE id = $${userParamCount}`,
            userValues
          );
        }
      }

      // Update worker profile
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      if (parsedServiceCategoryId !== undefined) {
        paramCount++;
        updateFields.push(`service_category_id = $${paramCount}`);
        values.push(parsedServiceCategoryId);
      }

      if (parsedExperienceYears !== undefined) {
        paramCount++;
        updateFields.push(`experience_years = $${paramCount}`);
        values.push(parsedExperienceYears);
      }

      if (parsedHourlyRate !== undefined) {
        paramCount++;
        updateFields.push(`hourly_rate = $${paramCount}`);
        values.push(parsedHourlyRate);
      }

      if (parsedBio !== undefined) {
        paramCount++;
        updateFields.push(`bio = $${paramCount}`);
        values.push(parsedBio);
      }

      if (parsedSkills !== undefined) {
        paramCount++;
        updateFields.push(`skills = $${paramCount}`);
        // PostgreSQL TEXT[] requires a JavaScript array, not JSON string
        // Ensure it's always an array
        const skillsArray = Array.isArray(parsedSkills) 
          ? parsedSkills 
          : (parsedSkills ? [parsedSkills] : []);
        values.push(skillsArray);
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        paramCount++;
        values.push(req.user.id);

        console.log('[Worker Profile Update] Updating worker_profiles with:', {
          fields: updateFields,
          values: values
        });

        await client.query(
          `UPDATE worker_profiles 
           SET ${updateFields.join(', ')}
           WHERE user_id = $${paramCount}`,
          values
        );
      }
    });
  } catch (transactionError) {
    console.error('[Worker Profile Update] Transaction error:', transactionError);
    
    // Check if it's a database constraint error (like VARCHAR length limit)
    if (transactionError.code === '22001' || 
        transactionError.message?.includes('value too long') || 
        transactionError.message?.includes('character varying') ||
        transactionError.message?.includes('VARCHAR')) {
      console.error('[Worker Profile Update] Database column length error detected. This usually means the profile_photo column needs to be migrated to TEXT type.');
      return res.status(400).json({
        success: false,
        message: 'Profile photo URL is too long. The database column needs to be migrated. Please restart the server to run the automatic migration, or contact the administrator.',
        error: 'Database column type mismatch. Expected TEXT, but column is still VARCHAR(500).'
      });
    }
    
    // Re-throw other errors to be handled by asyncHandler
    throw transactionError;
  }

  // Fetch updated profile with proper structure
  const result = await query(
    `SELECT 
      u.id, u.email, u.full_name, u.phone, u.profile_photo, u.address, 
      u.latitude, u.longitude, u.preferred_language, u.is_verified, u.is_active,
      u.created_at, u.updated_at,
      json_build_object(
        'id', wp.id,
        'service_category_id', wp.service_category_id,
        'bio', wp.bio,
        'hourly_rate', wp.hourly_rate,
        'experience_years', wp.experience_years,
        'skills', wp.skills,
        'availability_status', wp.availability_status,
        'verification_status', wp.verification_status,
        'average_rating', wp.average_rating,
        'total_reviews', wp.total_reviews,
        'total_jobs_completed', wp.total_jobs_completed,
        'is_featured', wp.is_featured
      ) as worker_profile,
      json_build_object(
        'service_category_id', wp.service_category_id,
        'availability_status', wp.availability_status,
        'verification_status', wp.verification_status,
        'average_rating', wp.average_rating,
        'total_reviews', wp.total_reviews
      ) as worker_info
     FROM users u
     INNER JOIN worker_profiles wp ON u.id = wp.user_id
     WHERE u.id = $1`,
    [req.user.id]
  );

  console.log('[Worker Profile Update] Updated successfully');

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: result.rows[0]
  });
});

// @desc    Update worker availability status
// @route   PUT /api/workers/availability
// @access  Private (Worker only)
const updateAvailability = asyncHandler(async (req, res) => {
  const { availability_status } = req.body;

  // Allow all workers to update availability, regardless of activation status
  // Job acceptance will still require active account (checked in booking endpoints)

  if (!['available', 'busy', 'offline'].includes(availability_status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid availability status. Must be: available, busy, or offline'
    });
  }

  await query(
    `UPDATE worker_profiles 
     SET availability_status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $2`,
    [availability_status, req.user.id]
  );

  res.json({
    success: true,
    message: 'Availability status updated',
    data: { availability_status }
  });
});

// @desc    Submit NID for verification (DEPRECATED - Use /api/verification/nid)
// @route   POST /api/workers/verify-nid
// @access  Private (Worker only)
// NOTE: Workers should now use the unified NID verification endpoint: POST /api/verification/nid
const submitNIDVerification = asyncHandler(async (req, res) => {
  // Redirect to unified NID verification system
  return res.status(301).json({
    success: false,
    message: 'This endpoint is deprecated. Please use POST /api/verification/nid instead.',
    redirect: '/api/verification/nid',
    note: 'Workers now use the same NID verification system as users for consistency and security.'
  });
});

// @desc    Get worker statistics
// @route   GET /api/workers/stats
// @access  Private (Worker only)
const getWorkerStats = asyncHandler(async (req, res) => {
  try {
    // Check if worker profile exists
    const profileCheck = await query(
      'SELECT user_id FROM worker_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileCheck.rows.length === 0) {
      // Return default stats if profile doesn't exist
      return res.json({
        success: true,
        data: {
          total_jobs_completed: 0,
          average_rating: 0,
          total_reviews: 0,
          pending_bookings: 0,
          active_bookings: 0,
          jobs_this_month: 0,
          total_earnings: 0
        }
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

    const bookingsTableExists = bookingsTableCheck.rows[0].exists;

    let pendingBookings = 0;
    let activeBookings = 0;
    let jobsThisMonth = 0;
    let totalEarnings = 0;

    if (bookingsTableExists) {
      // Get pending bookings count
      const pendingResult = await query(
        'SELECT COUNT(*) as count FROM bookings WHERE worker_id = $1 AND status = $2',
        [req.user.id, 'pending']
      );
      pendingBookings = parseInt(pendingResult.rows[0]?.count || 0);

      // Get active bookings count
      const activeResult = await query(
        'SELECT COUNT(*) as count FROM bookings WHERE worker_id = $1 AND status = $2',
        [req.user.id, 'in_progress']
      );
      activeBookings = parseInt(activeResult.rows[0]?.count || 0);

      // Get jobs this month
      const monthResult = await query(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE worker_id = $1 
         AND status = $2 
         AND EXTRACT(MONTH FROM completed_at) = EXTRACT(MONTH FROM CURRENT_DATE) 
         AND EXTRACT(YEAR FROM completed_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
        [req.user.id, 'completed']
      );
      jobsThisMonth = parseInt(monthResult.rows[0]?.count || 0);

      // Get total earnings
      const earningsResult = await query(
        `SELECT COALESCE(SUM(final_price), 0) as total FROM bookings 
         WHERE worker_id = $1 
         AND status = $2 
         AND payment_status = $3`,
        [req.user.id, 'completed', 'paid']
      );
      totalEarnings = parseFloat(earningsResult.rows[0]?.total || 0);
    }

    // Get worker profile stats
    const profileResult = await query(
      `SELECT 
        COALESCE(total_jobs_completed, 0) as total_jobs_completed,
        COALESCE(average_rating, 0) as average_rating,
        COALESCE(total_reviews, 0) as total_reviews
      FROM worker_profiles
      WHERE user_id = $1`,
      [req.user.id]
    );

    const profileData = profileResult.rows[0] || {
      total_jobs_completed: 0,
      average_rating: 0,
      total_reviews: 0
    };

    res.json({
      success: true,
      data: {
        total_jobs_completed: parseInt(profileData.total_jobs_completed || 0),
        average_rating: parseFloat(profileData.average_rating || 0),
        total_reviews: parseInt(profileData.total_reviews || 0),
        pending_bookings: pendingBookings,
        active_bookings: activeBookings,
        jobs_this_month: jobsThisMonth,
        total_earnings: totalEarnings
      }
    });
  } catch (error) {
    console.error('Error fetching worker stats:', error);
    // Return default stats on error
    res.json({
      success: true,
      data: {
        total_jobs_completed: 0,
        average_rating: 0,
        total_reviews: 0,
        pending_bookings: 0,
        active_bookings: 0,
        jobs_this_month: 0,
        total_earnings: 0
      }
    });
  }
});

// @desc    Get worker's slots
// @route   GET /api/workers/slots
// @access  Private (Worker only)
const getWorkerSlots = asyncHandler(async (req, res) => {
  const { date } = req.query;
  
  let queryText = `
    SELECT 
      id,
      slot_date,
      start_time,
      end_time,
      status,
      created_at,
      updated_at
    FROM worker_slots
    WHERE worker_id = $1
  `;
  const params = [req.user.id];
  
  if (date) {
    queryText += ` AND slot_date = $2`;
    params.push(date);
  } else {
    // Get slots for next 30 days
    queryText += ` AND slot_date >= CURRENT_DATE AND slot_date <= CURRENT_DATE + INTERVAL '30 days'`;
  }
  
  queryText += ` ORDER BY slot_date ASC, start_time ASC`;
  
  const result = await query(queryText, params);
  
  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Create worker slot
// @route   POST /api/workers/slots
// @access  Private (Worker only)
const createWorkerSlot = asyncHandler(async (req, res) => {
  const { slot_date, start_time } = req.body;
  
  if (!slot_date || !start_time) {
    return res.status(400).json({
      success: false,
      message: 'slot_date and start_time are required'
    });
  }
  
  // Validate date is not in the past
  const slotDate = new Date(slot_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  slotDate.setHours(0, 0, 0, 0);
  
  if (slotDate < today) {
    return res.status(400).json({
      success: false,
      message: 'Cannot create slots for past dates'
    });
  }
  
  // Validate time format
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(start_time)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid time format. Please use HH:MM format (e.g., 10:00)'
    });
  }
  
  // Calculate end_time (2 hours after start_time)
  const [hours, minutes] = start_time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return res.status(400).json({
      success: false,
      message: 'Invalid time values'
    });
  }
  
  const endHours = (hours + 2) % 24;
  const endMinutes = minutes;
  const end_time = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  
  // Check if slot already exists
  const existingSlot = await query(
    `SELECT id FROM worker_slots 
     WHERE worker_id = $1 AND slot_date = $2 AND start_time = $3`,
    [req.user.id, slot_date, start_time]
  );
  
  if (existingSlot.rows.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Slot already exists for this date and time'
    });
  }
  
  try {
    const result = await query(
      `INSERT INTO worker_slots (worker_id, slot_date, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [req.user.id, slot_date, start_time, end_time]
    );
    
    res.status(201).json({
      success: true,
      message: 'Slot created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating slot:', error);
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Invalid worker ID'
      });
    }
    throw error; // Let asyncHandler handle other errors
  }
});

// @desc    Update worker slot status
// @route   PUT /api/workers/slots/:slotId
// @access  Private (Worker only)
const updateWorkerSlot = asyncHandler(async (req, res) => {
  const { slotId } = req.params;
  const { status } = req.body;
  
  if (!status || !['active', 'busy'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'status must be either "active" or "busy"'
    });
  }
  
  // Verify slot belongs to worker
  const slotCheck = await query(
    `SELECT id FROM worker_slots WHERE id = $1 AND worker_id = $2`,
    [slotId, req.user.id]
  );
  
  if (slotCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Slot not found'
    });
  }
  
  // Don't allow updating booked slots
  const currentSlot = await query(
    `SELECT status FROM worker_slots WHERE id = $1`,
    [slotId]
  );
  
  if (currentSlot.rows[0].status === 'booked') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update a booked slot'
    });
  }
  
  const result = await query(
    `UPDATE worker_slots 
     SET status = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND worker_id = $3
     RETURNING *`,
    [status, slotId, req.user.id]
  );
  
  res.json({
    success: true,
    message: 'Slot updated successfully',
    data: result.rows[0]
  });
});

// @desc    Delete worker slot
// @route   DELETE /api/workers/slots/:slotId
// @access  Private (Worker only)
const deleteWorkerSlot = asyncHandler(async (req, res) => {
  const { slotId } = req.params;
  
  // Verify slot belongs to worker and is not booked
  const slotCheck = await query(
    `SELECT status FROM worker_slots WHERE id = $1 AND worker_id = $2`,
    [slotId, req.user.id]
  );
  
  if (slotCheck.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Slot not found'
    });
  }
  
  if (slotCheck.rows[0].status === 'booked') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete a booked slot'
    });
  }
  
  await query(
    `DELETE FROM worker_slots WHERE id = $1 AND worker_id = $2`,
    [slotId, req.user.id]
  );
  
  res.json({
    success: true,
    message: 'Slot deleted successfully'
  });
});

// @desc    Get available slots for a worker (for users)
// @route   GET /api/workers/:workerId/slots
// @access  Public
const getAvailableSlotsForWorker = asyncHandler(async (req, res) => {
  const { workerId } = req.params;
  const { date } = req.query;
  
  let queryText = `
    SELECT 
      id,
      slot_date,
      start_time,
      end_time,
      status
    FROM worker_slots
    WHERE worker_id = $1 AND status = 'active'
  `;
  const params = [workerId];
  
  if (date) {
    queryText += ` AND slot_date = $2`;
    params.push(date);
  } else {
    // Get slots for next 30 days
    queryText += ` AND slot_date >= CURRENT_DATE AND slot_date <= CURRENT_DATE + INTERVAL '30 days'`;
  }
  
  queryText += ` ORDER BY slot_date ASC, start_time ASC`;
  
  const result = await query(queryText, params);
  
  res.json({
    success: true,
    data: result.rows
  });
});

module.exports = {
  getWorkers,
  getWorkerById,
  updateWorkerProfile,
  updateAvailability,
  submitNIDVerification,
  getWorkerStats,
  getWorkerSlots,
  createWorkerSlot,
  updateWorkerSlot,
  deleteWorkerSlot,
  getAvailableSlotsForWorker
};