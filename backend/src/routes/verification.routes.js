const express = require('express');
const router = express.Router();
const {
  submitNIDVerification,
  getVerificationStatus
} = require('../controllers/nidVerificationController');
const { protect } = require('../middleware/auth');
const { uploadSingle, uploadToCloudinary } = require('../middleware/upload');

// All routes require authentication
router.use(protect);

// Submit NID for verification (with image upload and face verification)
// Note: selfie_image comes as base64 in body, not as file upload
router.post(
  '/nid',
  uploadSingle('nid_image'),
  uploadToCloudinary,
  submitNIDVerification
);

// Get user's verification status
router.get('/nid/status', getVerificationStatus);

module.exports = router;



