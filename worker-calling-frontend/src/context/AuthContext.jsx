import React, { createContext, useState, useEffect, useContext } from 'react';
import authService from '../services/authService';
import { toast } from 'react-toastify';
import { useLanguage } from './LanguageContext';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in on mount
    const initAuth = async () => {
      try {
        const storedUser = authService.getStoredUser();
        if (storedUser && authService.isAuthenticated()) {
          // Verify token is still valid by fetching current user
          const response = await authService.getCurrentUser();
          if (response.success) {
            setUser(response.data);
            setIsAuthenticated(true);
          } else {
            authService.logout();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authService.register(userData);
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        toast.success(t('auth.registrationSuccess'));
        return { success: true, data: response.data };
      } else {
        // Registration failed but didn't throw an error
        const errorMessage = response.message || t('common.serverError');
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('[Registration] Error:', error);
      const errorMessage = error.response?.data?.message || error.message || t('common.serverError');
      // Don't show toast here - api.js interceptor already shows it
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);
      if (response.success) {
        // Fetch full user data to get complete worker_profile
        const fullUserResponse = await authService.getCurrentUser();
        if (fullUserResponse.success) {
          setUser(fullUserResponse.data);
        } else {
          setUser(response.data.user);
        }
        setIsAuthenticated(true);
        toast.success(t('auth.loginSuccess'));
        return { success: true, data: response.data };
      }
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    toast.info(t('auth.logoutSuccess'));
  };

  const updateUser = (userData) => {
    // Merge new data with existing user data to preserve all fields
    const updatedUser = {
      ...user,
      ...userData,
      // Preserve nested objects - merge if both exist, otherwise use new or existing
      worker_info: userData.worker_info 
        ? { ...user?.worker_info, ...userData.worker_info }
        : (user?.worker_info || {}),
      worker_profile: userData.worker_profile 
        ? { ...user?.worker_profile, ...userData.worker_profile }
        : (user?.worker_profile || {}),
    };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    register,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;