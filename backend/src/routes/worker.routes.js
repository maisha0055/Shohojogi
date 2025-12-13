const express = require('express');
const router = express.Router();
const {
  getWorkers,
  getWorkerById,
  updateWorkerProfile,
  updateAvailability,
  submitNIDVerification,
  getWorkerStats
} = require('../controllers/workerController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getWorkers);
router.get('/:id', getWorkerById);

// Protected routes (Worker only)
router.put('/profile', protect, authorize('worker'), updateWorkerProfile);
router.put('/availability', protect, authorize('worker'), updateAvailability);
router.post('/verify-nid', protect, authorize('worker'), submitNIDVerification);
router.get('/stats/me', protect, authorize('worker'), getWorkerStats);

module.exports = router;