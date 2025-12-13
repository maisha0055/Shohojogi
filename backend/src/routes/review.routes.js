const express = require('express');
const router = express.Router();
const {
  createReview,
  getWorkerReviews,
  getUserReviews,
  updateReview,
  deleteReview,
  reportReview,
  getReviewStats
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/worker/:workerId', getWorkerReviews);
router.get('/stats/:workerId', getReviewStats);

// Protected routes
router.post('/', protect, authorize('user'), createReview);
router.get('/my-reviews', protect, authorize('user'), getUserReviews);
router.put('/:id', protect, authorize('user'), updateReview);
router.delete('/:id', protect, authorize('user'), deleteReview);
router.post('/:id/report', protect, reportReview);

module.exports = router;