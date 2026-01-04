const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
const { uploadMultiple, uploadMultipleToCloudinary } = require('../middleware/upload');

// Public route (no auth required)
router.post('/estimate-price', estimatePrice);

// All other routes are protected
router.use(protect);

// User routes
router.post('/', authorize('user'), createBooking);
router.post('/call-worker', authorize('user'), uploadMultiple('images', 3), uploadMultipleToCloudinary, callWorker);
router.post('/scheduled-slot', authorize('user'), createScheduledSlotBooking);
router.get('/my-bookings', authorize('user'), getUserBookings);
router.get('/:id/estimates', authorize('user'), getBookingEstimates);
router.get('/:id/estimates/:workerId/cart-data', authorize('user'), getEstimateCartData);
router.put('/:id/select-worker', authorize('user'), selectWorker);

// Worker routes
router.get('/worker-bookings', authorize('worker'), getWorkerBookings);
router.get('/available-slots', authorize('worker'), getAvailableSlots);
router.put('/:id/accept', authorize('worker'), acceptBooking);
router.put('/:id/accept-call', authorize('worker'), acceptCallRequest);
router.put('/:id/reject', authorize('worker'), rejectBooking);
router.put('/:id/start', authorize('worker'), startJob);
router.put('/:id/complete', authorize('worker'), completeJob);
router.post('/:id/submit-estimate', authorize('worker'), submitEstimate);
router.put('/slots/:slotId/accept', authorize('worker'), acceptScheduledSlot);

// Both user and worker can view and cancel
router.get('/:id', getBookingById);
router.get('/:id/images', getBookingImages);
router.put('/:id/cancel', cancelBooking);

module.exports = router;