import api from './api';

const chatService = {
  // Send message
  sendMessage: async (messageData) => {
    const response = await api.post('/api/chat/send', messageData);
    return response.data;
  },

  // Get conversation with specific user
  getConversation: async (userId, page = 1, limit = 50) => {
    const response = await api.get(`/api/chat/conversation/${userId}?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Get all conversations
  getConversations: async () => {
    const response = await api.get('/api/chat/conversations');
    return response.data;
  },

  // Mark messages as read
  markAsRead: async (userId) => {
    const response = await api.put(`/api/chat/read/${userId}`);
    return response.data;
  },

  // Get unread message count
  getUnreadCount: async () => {
    const response = await api.get('/api/chat/unread-count');
    return response.data;
  },
};

export default chatService;