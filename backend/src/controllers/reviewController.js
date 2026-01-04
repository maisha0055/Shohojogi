const { query, transaction } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Create review for completed booking
// @route   POST /api/reviews
// @access  Private (User only)
const createReview = asyncHandler(async (req, res) => {
  const { booking_id, rating, comment } = req.body;

  // Validation
  if (!booking_id || !rating) {
    return res.status(400).json({
      success: false,
      message: 'Booking ID and rating are required'
    });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5'
    });
  }

  // Check if booking exists and is completed
  const bookingResult = await query(
    `SELECT * FROM bookings WHERE id = $1 AND user_id = $2`,
    [booking_id, req.user.id]
  );

  if (bookingResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Booking not found or not authorized'
    });
  }

  const booking = bookingResult.rows[0];

  if (booking.status !== 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Can only review completed bookings'
    });
  }

  // Check if review already exists
  const existingReview = await query(
    'SELECT id FROM reviews WHERE booking_id = $1',
    [booking_id]
  );

  if (existingReview.rows.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'You have already reviewed this booking'
    });
  }

  // Create review
  const result = await transaction(async (client) => {
    const reviewResult = await client.query(
      `INSERT INTO reviews (booking_id, user_id, worker_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [booking_id, req.user.id, booking.worker_id, rating, comment]
    );

    // Notify worker
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        booking.worker_id,
        'New Review Received',
        `You received a ${rating}-star review`,
        'review',
        reviewResult.rows[0].id
      ]
    );

    // Award bonus points for leaving review
    await client.query(
      `INSERT INTO loyalty_points_history (user_id, booking_id, points_earned, description)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, booking_id, 5, 'Review submitted']
    );

    await client.query(
      `UPDATE users SET loyalty_points = loyalty_points + 5 WHERE id = $1`,
      [req.user.id]
    );

    return reviewResult.rows[0];
  });

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully',
    data: result
  });
});

// @desc    Get reviews for a worker
// @route   GET /api/reviews/worker/:workerId
// @access  Public
const getWorkerReviews = asyncHandler(async (req, res) => {
  const { workerId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT 
      r.*,
      u.full_name as user_name,
      u.profile_photo as user_photo,
      b.service_description
    FROM reviews r
    INNER JOIN users u ON r.user_id = u.id
    LEFT JOIN bookings b ON r.booking_id = b.id
    WHERE r.worker_id = $1 AND r.is_fake = false
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3`,
    [workerId, limit, offset]
  );

  // Get total count
  const countResult = await query(
    'SELECT COUNT(*) FROM reviews WHERE worker_id = $1 AND is_fake = false',
    [workerId]
  );

  const totalReviews = parseInt(countResult.rows[0].count);

  res.json({
    success: true,
    data: {
      reviews: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / limit),
        totalReviews
      }
    }
  });
});

// @desc    Get user's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private (User)
const getUserReviews = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT 
      r.*,
      w.full_name as worker_name,
      w.profile_photo as worker_photo,
      b.service_description
    FROM reviews r
    INNER JOIN users w ON r.worker_id = w.id
    LEFT JOIN bookings b ON r.booking_id = b.id
    WHERE r.user_id = $1
    ORDER BY r.created_at DESC`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Update review
// @route   PUT /api/reviews/:id
// @access  Private (User only)
const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (rating && (rating < 1 || rating > 5)) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5'
    });
  }

  const result = await query(
    `UPDATE reviews 
     SET rating = COALESCE($1, rating),
         comment = COALESCE($2, comment)
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [rating, comment, id, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Review not found or not authorized'
    });
  }

  res.json({
    success: true,
    message: 'Review updated successfully',
    data: result.rows[0]
  });
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private (User only)
const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    'DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Review not found or not authorized'
    });
  }

  res.json({
    success: true,
    message: 'Review deleted successfully'
  });
});

// @desc    Report review (for fake/inappropriate reviews)
// @route   POST /api/reviews/:id/report
// @access  Private
const reportReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason, description } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a reason for reporting'
    });
  }

  // Check if review exists
  const reviewResult = await query(
    'SELECT * FROM reviews WHERE id = $1',
    [id]
  );

  if (reviewResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  const review = reviewResult.rows[0];

  // Create report
  await query(
    `INSERT INTO reports (
      reporter_id, 
      reported_user_id, 
      review_id, 
      reason, 
      description
    ) VALUES ($1, $2, $3, $4, $5)`,
    [req.user.id, review.user_id, id, reason, description]
  );

  // Mark review as reported
  await query(
    'UPDATE reviews SET is_reported = true WHERE id = $1',
    [id]
  );

  res.json({
    success: true,
    message: 'Review reported successfully. Admin will review it.'
  });
});

// @desc    Get review statistics for worker
// @route   GET /api/reviews/stats/:workerId
// @access  Public
const getReviewStats = asyncHandler(async (req, res) => {
  const { workerId } = req.params;

  const result = await query(
    `SELECT 
      COUNT(*) as total_reviews,
      AVG(rating)::DECIMAL(3,2) as average_rating,
      COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
      COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
      COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
      COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
      COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
    FROM reviews
    WHERE worker_id = $1 AND is_fake = false`,
    [workerId]
  );

  res.json({
    success: true,
    data: result.rows[0]
  });
});

module.exports = {
  createReview,
  getWorkerReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  reportReview,
  getReviewStats
};