const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getConversation,
  getConversations,
  markAsRead,
  getUnreadCount
} = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Send message
router.post('/send', sendMessage);

// Get conversation with specific user
router.get('/conversation/:userId', getConversation);

// Get all conversations
router.get('/conversations', getConversations);

// Mark messages as read
router.put('/read/:userId', markAsRead);

// Get unread count
router.get('/unread-count', getUnreadCount);

module.exports = router;