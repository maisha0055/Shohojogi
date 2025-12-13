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
  cancelBooking
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// User routes
router.post('/', authorize('user'), createBooking);
router.get('/my-bookings', authorize('user'), getUserBookings);

// Worker routes
router.get('/worker-bookings', authorize('worker'), getWorkerBookings);
router.put('/:id/accept', authorize('worker'), acceptBooking);
router.put('/:id/reject', authorize('worker'), rejectBooking);
router.put('/:id/start', authorize('worker'), startJob);
router.put('/:id/complete', authorize('worker'), completeJob);

// Both user and worker can view and cancel
router.get('/:id', getBookingById);
router.put('/:id/cancel', cancelBooking);

module.exports = router;