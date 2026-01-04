const express = require('express');
const router = express.Router();
const {
  getMyLoyalty,
  redeemPoints
} = require('../controllers/loyaltyController');
const { protect } = require('../middleware/auth');

// All loyalty routes require authentication
router.get('/me', protect, getMyLoyalty);
router.post('/redeem', protect, redeemPoints);

module.exports = router;

