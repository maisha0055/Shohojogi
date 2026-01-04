const express = require('express');
const router = express.Router();
const {
  createBkashPayment,
  executeBkashPayment,
  createSslcommerzPayment,
  validateSslcommerzPayment,
  sslcommerzSuccessCallback,
  sslcommerzFailCallback,
  sslcommerzCancelCallback,
  sslcommerzIpnCallback,
  markCashPayment,
  getPaymentHistory,
  refundPayment
} = require('../controllers/paymentController');
const paymentController = require('../controllers/payment.controller');
const { protect, authorize } = require('../middleware/auth');

// bKash callback URL (public endpoint - must be before protect middleware)
router.get('/bkash/callback', paymentController.paymentCallback);

// SSLCommerz callbacks (public) - SSLCommerz may POST to these URLs
// These are redirect endpoints, so they need to bypass CORS like bKash callback
const cors = require('cors');
const allowAllCors = cors({ origin: true, credentials: true });

router.all('/sslcommerz/success', allowAllCors, sslcommerzSuccessCallback);
router.all('/sslcommerz/fail', allowAllCors, sslcommerzFailCallback);
router.all('/sslcommerz/cancel', allowAllCors, sslcommerzCancelCallback);
router.post('/sslcommerz/ipn', allowAllCors, sslcommerzIpnCallback);

// All other routes are protected
router.use(protect);

// bKash Payment Routes
// Create a new bKash payment
router.post('/bkash/create-payment', authorize(['user', 'admin']), paymentController.createPayment);
// Execute bKash payment after completion
router.post('/bkash/execute-payment', authorize(['user', 'admin']), paymentController.executePayment);
// Check payment status
router.get('/bkash/status/:paymentID', authorize(['user', 'admin']), paymentController.paymentStatus);

// Legacy bKash routes (keeping for backward compatibility)
router.post('/bkash/create', authorize('user'), createBkashPayment);
router.post('/bkash/execute', authorize('user'), executeBkashPayment);

// SSLCommerz routes (legacy-style, matching frontend flow)
router.post('/sslcommerz/create', authorize('user'), createSslcommerzPayment);
router.post('/sslcommerz/validate', authorize('user'), validateSslcommerzPayment);

// Worker routes
router.post('/cash', authorize('worker'), markCashPayment);

// Common routes
router.get('/history', getPaymentHistory);

// Admin routes
router.post('/refund', authorize('admin'), refundPayment);

module.exports = router;