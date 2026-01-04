import api from './api';

const reviewService = {
  createReview: async (bookingId, rating, comment) => {
    const response = await api.post('/api/reviews', {
      booking_id: bookingId,
      rating,
      comment
    });
    return response.data;
  },

  getWorkerReviews: async (workerId, page = 1, limit = 20) => {
    const response = await api.get(`/api/reviews/worker/${workerId}`, {
      params: { page, limit }
    });
    return response.data;
  },

  getUserReviews: async () => {
    const response = await api.get('/api/reviews/my-reviews');
    return response.data;
  },

  updateReview: async (reviewId, rating, comment) => {
    const response = await api.put(`/api/reviews/${reviewId}`, {
      rating,
      comment
    });
    return response.data;
  },

  deleteReview: async (reviewId) => {
    const response = await api.delete(`/api/reviews/${reviewId}`);
    return response.data;
  }
};

export default reviewService;

