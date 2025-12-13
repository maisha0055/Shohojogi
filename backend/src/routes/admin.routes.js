const express = require('express');
const router = express.Router();
const {
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getAllUsers,
  deactivateUser,
  activateUser,
  getReports,
  updateReportStatus,
  markReviewAsFake,
  getPlatformStats,
  toggleFeatureWorker
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All routes are admin-only
router.use(protect);
router.use(authorize('admin'));

// Verification management
router.get('/verifications/pending', getPendingVerifications);
router.put('/verifications/:workerId/approve', approveVerification);
router.put('/verifications/:workerId/reject', rejectVerification);

// User management
router.get('/users', getAllUsers);
router.put('/users/:userId/deactivate', deactivateUser);
router.put('/users/:userId/activate', activateUser);

// Worker management
router.put('/workers/:workerId/feature', toggleFeatureWorker);

// Report management
router.get('/reports', getReports);
router.put('/reports/:reportId', updateReportStatus);

// Review management
router.put('/reviews/:reviewId/mark-fake', markReviewAsFake);

// Platform statistics
router.get('/stats', getPlatformStats);

module.exports = router;