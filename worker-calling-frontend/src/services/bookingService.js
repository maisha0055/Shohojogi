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
  // For all booking types, finalPrice should be null (backend will use estimated_price)
  // Price was already fixed/estimated before booking, so no need to ask worker for final price
  completeJob: async (bookingId, finalPrice) => {
    const payload = {};
    // Don't send final_price - backend will use estimated_price for all booking types
    // This parameter is kept for backward compatibility but should always be null
    if (finalPrice !== null && finalPrice !== undefined) {
      payload.final_price = finalPrice;
    }
    const response = await api.put(`/api/bookings/${bookingId}/complete`, payload);
    return response.data;
  },

  // Cancel booking
  cancelBooking: async (bookingId, reason) => {
    const response = await api.put(`/api/bookings/${bookingId}/cancel`, { reason });
    return response.data;
  },

  // Call worker (Uber-like) - Broadcast to all active workers with images
  callWorker: async (callData, imageFiles = []) => {
    try {
      // If imageFiles are provided, use FormData
      if (imageFiles && imageFiles.length > 0) {
        const formData = new FormData();
        
        // Add all callData fields
        for (const key in callData) {
          if (callData[key] !== null && callData[key] !== undefined) {
            formData.append(key, callData[key]);
          }
        }
        
        // Add image files
        imageFiles.forEach((file) => {
          formData.append('images', file);
        });

        const response = await api.post('/api/bookings/call-worker', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      } else {
        // Fallback: send as JSON with base64 image_urls
        const response = await api.post('/api/bookings/call-worker', callData);
        return response.data;
      }
    } catch (error) {
      throw error;
    }
  },

  // Worker accepts a call request
  acceptCallRequest: async (bookingId) => {
    const response = await api.put(`/api/bookings/${bookingId}/accept-call`);
    return response.data;
  },

  // Create scheduled slot booking
  createScheduledSlotBooking: async (bookingData) => {
    const response = await api.post('/api/bookings/scheduled-slot', bookingData);
    return response.data;
  },

  // Worker accepts a scheduled slot
  acceptScheduledSlot: async (slotId) => {
    const response = await api.put(`/api/bookings/slots/${slotId}/accept`);
    return response.data;
  },

  // Get available scheduled slots (for workers)
  getAvailableSlots: async (categoryId = null, date = null) => {
    const params = new URLSearchParams();
    if (categoryId) params.append('category_id', categoryId);
    if (date) params.append('date', date);
    const response = await api.get(`/api/bookings/available-slots?${params.toString()}`);
    return response.data;
  },

  // Estimate booking price
  estimatePrice: async (estimationData) => {
    const response = await api.post('/api/bookings/estimate-price', estimationData);
    return response.data;
  },

  // Worker submits estimate
  submitEstimate: async (bookingId, estimateData) => {
    const response = await api.post(`/api/bookings/${bookingId}/submit-estimate`, estimateData);
    return response.data;
  },

  // User selects worker from estimates
  selectWorker: async (bookingId, workerId) => {
    const response = await api.put(`/api/bookings/${bookingId}/select-worker`, { worker_id: workerId });
    return response.data;
  },

  // Get booking estimates
  getBookingEstimates: async (bookingId) => {
    const response = await api.get(`/api/bookings/${bookingId}/estimates`);
    return response.data;
  },

  // Get estimate cart data (for adding to cart)
  getEstimateCartData: async (bookingId, workerId) => {
    const response = await api.get(`/api/bookings/${bookingId}/estimates/${workerId}/cart-data`);
    return response.data;
  },
};

export default bookingService;