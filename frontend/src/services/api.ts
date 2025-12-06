// ============================================
// FILE: src/services/api.ts
// ============================================
import axios from 'axios';
import type {
  AuthResponse,
  RegisterData,
  LoginData,
  User,
  UpdateProfileData,
  Worker,
  Service,
  SearchWorkerParams,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/users/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    const response = await api.put<User>('/users/profile', data);
    return response.data;
  },
};

// Workers API
export const workersAPI = {
  getAll: async (): Promise<Worker[]> => {
    const response = await api.get<Worker[]>('/workers');
    return response.data;
  },

  getOne: async (id: string): Promise<Worker> => {
    const response = await api.get<Worker>(`/workers/${id}`);
    return response.data;
  },

  search: async (params: SearchWorkerParams): Promise<Worker[]> => {
    const response = await api.get<Worker[]>('/workers/search', { params });
    return response.data;
  },

  create: async (skills: string[]): Promise<Worker> => {
    const response = await api.post<Worker>('/workers/create', { skills });
    return response.data;
  },

  updateLocation: async (
    id: string,
    location: { latitude: number; longitude: number; location: string }
  ): Promise<Worker> => {
    const response = await api.put<Worker>(`/workers/${id}/location`, location);
    return response.data;
  },

  updateAvailability: async (id: string, isAvailable: boolean): Promise<Worker> => {
    const response = await api.put<Worker>(`/workers/${id}/availability`, {
      isAvailable,
    });
    return response.data;
  },
};

// Services API
export const servicesAPI = {
  getAll: async (): Promise<Service[]> => {
    const response = await api.get<Service[]>('/services');
    return response.data;
  },

  getOne: async (id: string): Promise<Service> => {
    const response = await api.get<Service>(`/services/${id}`);
    return response.data;
  },

  seed: async (): Promise<{ message: string }> => {
    const response = await api.post('/services/seed');
    return response.data;
  },
};

export default api;