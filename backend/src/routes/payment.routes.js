const express = require('express');
const router = express.Router();
const {
  createBkashPayment,
  executeBkashPayment,
  markCashPayment,
  getPaymentHistory,
  refundPayment
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// User routes
router.post('/bkash/create', authorize('user'), createBkashPayment);
router.post('/bkash/execute', authorize('user'), executeBkashPayment);

// Worker routes
router.post('/cash', authorize('worker'), markCashPayment);

// Common routes
router.get('/history', getPaymentHistory);

// Admin routes
router.post('/refund', authorize('admin'), refundPayment);

module.exports = router;