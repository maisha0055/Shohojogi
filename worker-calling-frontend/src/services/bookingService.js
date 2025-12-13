import api from './api';

const bookingService = {
  // Create new booking
  createBooking: async (bookingData) => {
    const response = await api.post('/api/bookings', bookingData);
    return response.data;
  },

  // Get user's bookings
  getUserBookings: async (status = null, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    const response = await api.get(`/api/bookings/my-bookings?${params.toString()}`);
    return response.data;
  },

  // Get worker's bookings
  getWorkerBookings: async (status = null, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    const response = await api.get(`/api/bookings/worker-bookings?${params.toString()}`);
    return response.data;
  },

  // Get booking details
  getBookingById: async (bookingId) => {
    const response = await api.get(`/api/bookings/${bookingId}`);
    return response.data;
  },

  // Accept booking (Worker)
  acceptBooking: async (bookingId) => {
    const response = await api.put(`/api/bookings/${bookingId}/accept`);
    return response.data;
  },

  // Reject booking (Worker)
  rejectBooking: async (bookingId, reason) => {
    const response = await api.put(`/api/bookings/${bookingId}/reject`, { reason });
    return response.data;
  },

  // Start job (Worker)
  startJob: async (bookingId) => {
    const response = await api.put(`/api/bookings/${bookingId}/start`);
    return response.data;
  },

  // Complete job (Worker)
  completeJob: async (bookingId, finalPrice) => {
    const response = await api.put(`/api/bookings/${bookingId}/complete`, {
      final_price: finalPrice
    });
    return response.data;
  },

  // Cancel booking
  cancelBooking: async (bookingId, reason) => {
    const response = await api.put(`/api/bookings/${bookingId}/cancel`, { reason });
    return response.data;
  },
};

export default bookingService;