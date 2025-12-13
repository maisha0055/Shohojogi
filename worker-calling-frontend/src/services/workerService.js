import api from './api';

const workerService = {
  // Get all workers with filters
  getWorkers: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params.append(key, filters[key]);
      }
    });
    const response = await api.get(`/api/workers?${params.toString()}`);
    return response.data;
  },

  // Get single worker
  getWorkerById: async (workerId) => {
    const response = await api.get(`/api/workers/${workerId}`);
    return response.data;
  },

  // Update worker profile
  updateWorkerProfile: async (profileData) => {
    const response = await api.put('/api/workers/profile', profileData);
    return response.data;
  },

  // Update availability status
  updateAvailability: async (status) => {
    const response = await api.put('/api/workers/availability', {
      availability_status: status
    });
    return response.data;
  },

  // Submit NID verification
  submitNIDVerification: async (nidData) => {
    const response = await api.post('/api/workers/verify-nid', nidData);
    return response.data;
  },

  // Get worker statistics
  getWorkerStats: async () => {
    const response = await api.get('/api/workers/stats/me');
    return response.data;
  },

  // Search workers nearby
  searchNearby: async (latitude, longitude, radius = 10, categoryId = null) => {
    const params = new URLSearchParams({
      latitude,
      longitude,
      radius,
      availability_status: 'available'
    });
    
    if (categoryId) {
      params.append('service_category_id', categoryId);
    }

    const response = await api.get(`/api/workers?${params.toString()}`);
    return response.data;
  },
};

export default workerService;