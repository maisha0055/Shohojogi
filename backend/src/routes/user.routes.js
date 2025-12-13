const express = require('express');
const router = express.Router();
const {
  updateProfile,
  uploadProfilePhoto,
  getDashboard,
  addFavorite,
  removeFavorite,
  getFavorites,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getLoyaltyPoints
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Profile routes
router.put('/profile', updateProfile);
router.put('/profile-photo', uploadProfilePhoto);

// Dashboard
router.get('/dashboard', getDashboard);

// Favorites (User only)
router.post('/favorites/:workerId', authorize('user'), addFavorite);
router.delete('/favorites/:workerId', authorize('user'), removeFavorite);
router.get('/favorites', authorize('user'), getFavorites);

// Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/read-all', markAllNotificationsRead);

// Loyalty points (User only)
router.get('/loyalty-points', authorize('user'), getLoyaltyPoints);

module.exports = router;