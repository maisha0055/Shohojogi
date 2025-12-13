const { query, transaction } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { extractNIDData, compareNIDData } = require('../services/geminiService');

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

  // Build base query with or without distance
  let baseSelect = `
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
      sc.name_bn as service_category_name_bn`;

  // Add distance calculation if location provided
  if (latitude && longitude) {
    baseSelect += `,
      (6371 * acos(
        cos(radians($1)) * cos(radians(u.latitude)) *
        cos(radians(u.longitude) - radians($2)) +
        sin(radians($1)) * sin(radians(u.latitude))
      )) as distance_km`;
  }

  let baseQuery = baseSelect + `
    FROM users u
    INNER JOIN worker_profiles wp ON u.id = wp.user_id
    LEFT JOIN service_categories sc ON wp.service_category_id = sc.id
    WHERE u.role = 'worker' 
      AND u.is_active = true
      AND wp.verification_status = 'verified'
  `;

  const params = [];
  let paramCount = latitude && longitude ? 2 : 0;

  // Add filters
  if (service_category_id) {
    paramCount++;
    baseQuery += ` AND wp.service_category_id = $${paramCount}`;
    params.push(service_category_id);
  }

  if (availability_status && availability_status !== '') {
    paramCount++;
    baseQuery += ` AND wp.availability_status = $${paramCount}`;
    params.push(availability_status);
  }

  if (min_rating) {
    paramCount++;
    baseQuery += ` AND wp.average_rating >= $${paramCount}`;
    params.push(min_rating);
  }

  if (search) {
    paramCount++;
    baseQuery += ` AND (u.full_name ILIKE $${paramCount} OR wp.bio ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  // Wrap in subquery if distance filtering needed, otherwise use directly
  let queryText;
  if (latitude && longitude) {
    queryText = `
      SELECT * FROM (
        ${baseQuery}
      ) as workers_with_distance
      WHERE distance_km <= ${radius}
      ORDER BY distance_km ASC, average_rating DESC, is_featured DESC
    `;
  } else {
    queryText = baseQuery + ` 
      ORDER BY wp.is_featured DESC, wp.average_rating DESC, wp.total_reviews DESC
    `;
  }

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
      AND wp.verification_status = 'verified'
  `;

  const countParams = [];
  let countParamIndex = 0;

  if (service_category_id) {
    countParamIndex++;
    countQuery += ` AND wp.service_category_id = $${countParamIndex}`;
    countParams.push(service_category_id);
  }

  if (availability_status && availability_status !== '') {
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

  const result = await query(
    `SELECT 
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
      wp.user_id,
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
      COALESCE((
        SELECT json_agg(review_data)
        FROM (
          SELECT json_build_object(
            'id', r.id,
            'rating', r.rating,
            'comment', r.comment,
            'user_name', usr.full_name,
            'user_photo', usr.profile_photo,
            'created_at', r.created_at
          ) as review_data
          FROM reviews r
          INNER JOIN users usr ON r.user_id = usr.id
          WHERE r.worker_id = u.id AND r.is_fake = false
          ORDER BY r.created_at DESC
          LIMIT 10
        ) as review_subquery
      ), '[]'::json) as recent_reviews
    FROM users u
    INNER JOIN worker_profiles wp ON u.id = wp.user_id
    LEFT JOIN service_categories sc ON wp.service_category_id = sc.id
    WHERE u.id = $1 AND u.role = 'worker'`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Worker not found'
    });
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Update worker profile
// @route   PUT /api/workers/profile
// @access  Private (Worker only)
const updateWorkerProfile = asyncHandler(async (req, res) => {
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

  // Verify user is a worker
  if (req.user.role !== 'worker') {
    return res.status(403).json({
      success: false,
      message: 'Only workers can update worker profiles'
    });
  }

  await transaction(async (client) => {
    // Update user basic info
    if (address || latitude || longitude) {
      await client.query(
        `UPDATE users 
         SET address = COALESCE($1, address),
             latitude = COALESCE($2, latitude),
             longitude = COALESCE($3, longitude),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [address, latitude, longitude, req.user.id]
      );
    }

    // Update worker profile
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    if (service_category_id !== undefined) {
      paramCount++;
      updateFields.push(`service_category_id = $${paramCount}`);
      values.push(service_category_id);
    }

    if (experience_years !== undefined) {
      paramCount++;
      updateFields.push(`experience_years = $${paramCount}`);
      values.push(experience_years);
    }

    if (hourly_rate !== undefined) {
      paramCount++;
      updateFields.push(`hourly_rate = $${paramCount}`);
      values.push(hourly_rate);
    }

    if (bio !== undefined) {
      paramCount++;
      updateFields.push(`bio = $${paramCount}`);
      values.push(bio);
    }

    if (skills !== undefined) {
      paramCount++;
      updateFields.push(`skills = $${paramCount}`);
      values.push(skills);
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      paramCount++;
      values.push(req.user.id);

      await client.query(
        `UPDATE worker_profiles 
         SET ${updateFields.join(', ')}
         WHERE user_id = $${paramCount}`,
        values
      );
    }
  });

  // Fetch updated profile
  const result = await query(
    `SELECT u.*, wp.*
     FROM users u
     INNER JOIN worker_profiles wp ON u.id = wp.user_id
     WHERE u.id = $1`,
    [req.user.id]
  );

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

// @desc    Submit NID for verification
// @route   POST /api/workers/verify-nid
// @access  Private (Worker only)
const submitNIDVerification = asyncHandler(async (req, res) => {
  const { nid_number, nid_image_url, full_name } = req.body;

  if (!nid_number || !nid_image_url) {
    return res.status(400).json({
      success: false,
      message: 'NID number and image are required'
    });
  }

  // Extract data from NID image using Gemini
  console.log('Extracting NID data from image...');
  const extractionResult = await extractNIDData(nid_image_url);

  if (!extractionResult.success) {
    return res.status(400).json({
      success: false,
      message: extractionResult.error
    });
  }

  // Compare extracted data with provided data
  const comparisonResult = compareNIDData(
    extractionResult.data,
    { nid_number, full_name: full_name || req.user.full_name }
  );

  // Update worker profile with verification data
  await query(
    `UPDATE worker_profiles 
     SET nid_number = $1,
         nid_image_url = $2,
         extracted_nid_data = $3,
         verification_status = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $5`,
    [
      nid_number,
      nid_image_url,
      JSON.stringify({
        extracted: extractionResult.data,
        comparison: comparisonResult
      }),
      comparisonResult.isMatch ? 'pending' : 'pending', // Admin still reviews
      req.user.id
    ]
  );

  res.json({
    success: true,
    message: 'NID verification submitted. Admin will review shortly.',
    data: {
      verification_status: 'pending',
      match_score: comparisonResult.matchScore,
      recommendation: comparisonResult.recommendation,
      mismatches: comparisonResult.mismatches
    }
  });
});

// @desc    Get worker statistics
// @route   GET /api/workers/stats
// @access  Private (Worker only)
const getWorkerStats = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT 
      wp.total_jobs_completed,
      wp.average_rating,
      wp.total_reviews,
      (SELECT COUNT(*) FROM bookings WHERE worker_id = $1 AND status = 'pending') as pending_bookings,
      (SELECT COUNT(*) FROM bookings WHERE worker_id = $1 AND status = 'in_progress') as active_bookings,
      (SELECT COUNT(*) FROM bookings WHERE worker_id = $1 AND status = 'completed' AND EXTRACT(MONTH FROM completed_at) = EXTRACT(MONTH FROM CURRENT_DATE)) as jobs_this_month,
      (SELECT SUM(final_price) FROM bookings WHERE worker_id = $1 AND status = 'completed' AND payment_status = 'paid') as total_earnings
    FROM worker_profiles wp
    WHERE wp.user_id = $1`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: result.rows[0]
  });
});

module.exports = {
  getWorkers,
  getWorkerById,
  updateWorkerProfile,
  updateAvailability,
  submitNIDVerification,
  getWorkerStats
};