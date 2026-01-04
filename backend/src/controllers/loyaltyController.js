const { query, transaction } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get current user's loyalty information
// @route   GET /api/loyalty/me
// @access  Private
const getMyLoyalty = asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT loyalty_points, loyalty_tier FROM users WHERE id = $1',
    [req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const user = result.rows[0];

  res.json({
    success: true,
    data: {
      loyalty_points: user.loyalty_points || 0,
      loyalty_tier: user.loyalty_tier || 'Bronze'
    }
  });
});

// @desc    Redeem loyalty points for discount
// @route   POST /api/loyalty/redeem
// @access  Private
const redeemPoints = asyncHandler(async (req, res) => {
  const { points_to_redeem, booking_price } = req.body;

  // Validation
  if (!points_to_redeem || points_to_redeem <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Points to redeem must be greater than 0'
    });
  }

  if (!booking_price || booking_price <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Booking price is required'
    });
  }

  // Get user's current loyalty points
  const userResult = await query(
    'SELECT loyalty_points FROM users WHERE id = $1',
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const user = userResult.rows[0];
  const availablePoints = user.loyalty_points || 0;

  // Check if user has enough points
  if (points_to_redeem > availablePoints) {
    return res.status(400).json({
      success: false,
      message: `Insufficient points. You have ${availablePoints} points available.`
    });
  }

  // Calculate discount: 10 points = 50 BDT
  const discountAmount = (points_to_redeem / 10) * 50;

  // Maximum discount: 20% of booking price
  const maxDiscount = booking_price * 0.20;
  const finalDiscount = Math.min(discountAmount, maxDiscount);

  // Calculate actual points needed (may be less if discount is capped)
  const actualPointsNeeded = Math.floor((finalDiscount / 50) * 10);

  // Ensure points never go negative
  if (actualPointsNeeded > availablePoints) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient points for this redemption'
    });
  }

  res.json({
    success: true,
    data: {
      points_to_redeem: actualPointsNeeded,
      discount_amount: finalDiscount,
      final_price: booking_price - finalDiscount,
      message: `You can redeem ${actualPointsNeeded} points for ৳${finalDiscount.toFixed(2)} discount`
    }
  });
});

module.exports = {
  getMyLoyalty,
  redeemPoints
};

