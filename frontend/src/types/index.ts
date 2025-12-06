// ============================================
// FILE: src/types/index.ts
// ============================================
export enum UserRole {
    USER = 'user',
    WORKER = 'worker',
    ADMIN = 'admin',
  }
  
  export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    profilePhoto?: string;
    address?: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Worker {
    id: string;
    userId: string;
    user: User;
    skills: string[];
    latitude?: number;
    longitude?: number;
    location?: string;
    rating: number;
    totalReviews: number;
    isAvailable: boolean;
    bio?: string;
    hourlyRate?: number;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Service {
    id: string;
    name: string;
    description: string;
    icon?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface AuthResponse {
    user: User;
    token: string;
  }
  
  export interface RegisterData {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: UserRole;
  }
  
  export interface LoginData {
    email: string;
    password: string;
  }
  
  export interface UpdateProfileData {
    name?: string;
    phone?: string;
    profilePhoto?: string;
    address?: string;
  }
  
  export interface SearchWorkerParams {
    location?: string;
    skills?: string[];
    minRating?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
  }