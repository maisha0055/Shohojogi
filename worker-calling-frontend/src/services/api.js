import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout (increased for payment operations)
});

// Request interceptor - add token and handle FormData
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If FormData is being sent, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Check if error handling should be skipped (for silent failures)
    // This is set via config.skipErrorHandling in the request
    const skipErrorHandling = error.config?.skipErrorHandling;
    
    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      if (!skipErrorHandling) {
        toast.error('Request timeout. Please try again.');
      }
      return Promise.reject(error);
    }

    // Handle network error
    if (!error.response) {
      if (!skipErrorHandling) {
        toast.error('Network error. Please check your connection.');
      }
      return Promise.reject(error);
    }

    const message = error.response?.data?.message || 'Something went wrong';
    const status = error.response?.status;

    // Skip error handling if flag is set
    if (skipErrorHandling) {
      return Promise.reject(error);
    }

    // Don't show error toasts for worker dashboard stats/bookings endpoints
    // These are handled silently in the component
    const url = error.config?.url || '';
    const silentEndpoints = [
      '/api/workers/stats/me',
      '/api/bookings/worker-bookings',
      '/api/bookings/available-slots',
      '/api/users/job-alerts',
      '/api/verification/nid/status'
    ];
    
    const isSilentEndpoint = silentEndpoints.some(endpoint => url.includes(endpoint));
    if (isSilentEndpoint && (status === 500 || status >= 500)) {
      // Silently fail for worker dashboard endpoints with server errors
      return Promise.reject(error);
    }

    // Handle specific error cases
    if (status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (status === 404) {
      toast.error('Resource not found.');
    } else if (status === 500) {
      toast.error('Server error. Please try again later.');
    } else if (status === 400) {
      // Bad request - show specific error message
      toast.error(message);
    } else {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;

// Helper functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  delete api.defaults.headers.common['Authorization'];
};

// Test API connection
export const testConnection = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('API connection test failed:', error);
    return null;
  }
};