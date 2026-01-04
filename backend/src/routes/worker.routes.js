const express = require('express');
const router = express.Router();
const {
  getWorkers,
  getWorkerById,
  updateWorkerProfile,
  updateAvailability,
  submitNIDVerification,
  getWorkerStats,
  getWorkerSlots,
  createWorkerSlot,
  updateWorkerSlot,
  deleteWorkerSlot,
  getAvailableSlotsForWorker
} = require('../controllers/workerController');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle, uploadToCloudinary } = require('../middleware/upload');

// Public routes
router.get('/', getWorkers);

// Slot management routes (Worker only) - MUST be before /:id route
router.get('/slots', protect, authorize('worker'), getWorkerSlots);
router.post('/slots', protect, authorize('worker'), createWorkerSlot);
router.put('/slots/:slotId', protect, authorize('worker'), updateWorkerSlot);
router.delete('/slots/:slotId', protect, authorize('worker'), deleteWorkerSlot);

// Public route to get available slots for a worker (must be before /:id route)
router.get('/:workerId/slots', getAvailableSlotsForWorker);

// Public route to get worker by ID (must be last to avoid catching other routes)
router.get('/:id', getWorkerById);

// Protected routes (Worker only)
router.put('/profile', protect, authorize('worker'), uploadSingle('profile_photo'), uploadToCloudinary, updateWorkerProfile);
router.put('/availability', protect, authorize('worker'), updateAvailability);
router.post('/verify-nid', protect, authorize('worker'), submitNIDVerification);
router.get('/stats/me', protect, authorize('worker'), getWorkerStats);

module.exports = router;