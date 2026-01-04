const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { notifyUser } = require('../socket/socketServer');

// @desc    Send message
// @route   POST /api/chat/send
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { booking_id, receiver_id, message_text } = req.body;

  if (!receiver_id || !message_text) {
    return res.status(400).json({
      success: false,
      message: 'Receiver ID and message text are required'
    });
  }

  // Verify booking if provided
  if (booking_id) {
    const bookingCheck = await query(
      'SELECT * FROM bookings WHERE id = $1 AND (user_id = $2 OR worker_id = $2)',
      [booking_id, req.user.id]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this booking'
      });
    }
  }

  const result = await query(
    `INSERT INTO messages (booking_id, sender_id, receiver_id, message_text)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [booking_id || null, req.user.id, receiver_id, message_text]
  );

  // Create notification for receiver
  await query(
    `INSERT INTO notifications (user_id, title, message, type, reference_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      receiver_id,
      'New Message',
      `You have a new message from ${req.user.full_name}`,
      'message',
      result.rows[0].id
    ]
  );

  // Notify receiver via socket
  notifyUser(receiver_id, 'message:new', {
    message_id: result.rows[0].id,
    sender_id: req.user.id,
    sender_name: req.user.full_name,
    message_text: message_text,
    booking_id: booking_id || null
  });

  res.status(201).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Get conversation between two users
// @route   GET /api/chat/conversation/:userId
// @access  Private
const getConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  const result = await query(
    `SELECT 
      m.*,
      sender.full_name as sender_name,
      sender.profile_photo as sender_photo,
      receiver.full_name as receiver_name,
      receiver.profile_photo as receiver_photo
    FROM messages m
    INNER JOIN users sender ON m.sender_id = sender.id
    INNER JOIN users receiver ON m.receiver_id = receiver.id
    WHERE (m.sender_id = $1 AND m.receiver_id = $2) 
       OR (m.sender_id = $2 AND m.receiver_id = $1)
    ORDER BY m.created_at DESC
    LIMIT $3 OFFSET $4`,
    [req.user.id, userId, limit, offset]
  );

  // Mark messages as read
  await query(
    `UPDATE messages 
     SET is_read = true 
     WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false`,
    [req.user.id, userId]
  );

  res.json({
    success: true,
    data: result.rows.reverse() // Reverse to show oldest first
  });
});

// @desc    Get all conversations (list of people user has chatted with)
// @route   GET /api/chat/conversations
// @access  Private
const getConversations = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT DISTINCT ON (other_user_id)
      other_user_id as user_id,
      other_user_name as full_name,
      other_user_photo as profile_photo,
      last_message,
      last_message_time,
      unread_count
    FROM (
      SELECT 
        CASE 
          WHEN m.sender_id = $1 THEN m.receiver_id 
          ELSE m.sender_id 
        END as other_user_id,
        CASE 
          WHEN m.sender_id = $1 THEN receiver.full_name 
          ELSE sender.full_name 
        END as other_user_name,
        CASE 
          WHEN m.sender_id = $1 THEN receiver.profile_photo 
          ELSE sender.profile_photo 
        END as other_user_photo,
        m.message_text as last_message,
        m.created_at as last_message_time,
        (
          SELECT COUNT(*) 
          FROM messages 
          WHERE receiver_id = $1 
            AND sender_id = CASE 
              WHEN m.sender_id = $1 THEN m.receiver_id 
              ELSE m.sender_id 
            END
            AND is_read = false
        ) as unread_count
      FROM messages m
      INNER JOIN users sender ON m.sender_id = sender.id
      INNER JOIN users receiver ON m.receiver_id = receiver.id
      WHERE m.sender_id = $1 OR m.receiver_id = $1
      ORDER BY m.created_at DESC
    ) conversations
    ORDER BY other_user_id, last_message_time DESC`,
    [req.user.id]
  );

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Mark conversation as read
// @route   PUT /api/chat/read/:userId
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  await query(
    `UPDATE messages 
     SET is_read = true 
     WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false`,
    [req.user.id, userId]
  );

  res.json({
    success: true,
    message: 'Messages marked as read'
  });
});

// @desc    Get unread message count
// @route   GET /api/chat/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = false',
    [req.user.id]
  );

  res.json({
    success: true,
    data: {
      unread_count: parseInt(result.rows[0].count)
    }
  });
});

module.exports = {
  sendMessage,
  getConversation,
  getConversations,
  markAsRead,
  getUnreadCount
};