import { format } from 'date-fns';

// Format date
export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '';
  return format(new Date(date), formatStr);
};

// Format time
export const formatTime = (time) => {
  if (!time) return '';
  return format(new Date(`2000-01-01 ${time}`), 'hh:mm a');
};

// Format currency
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '৳0';
  return `৳${Number(amount).toLocaleString('en-BD')}`;
};

// Format phone number
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('880')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return `+880${cleaned.slice(1)}`;
  }
  return `+880${cleaned}`;
};

// Truncate text
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Get status color
export const getStatusColor = (status) => {
  const colors = {
    pending: 'yellow',
    accepted: 'blue',
    in_progress: 'purple',
    completed: 'green',
    cancelled: 'red',
    rejected: 'gray',
    available: 'green',
    busy: 'yellow',
    offline: 'gray',
  };
  return colors[status] || 'gray';
};

// Get status badge class
export const getStatusBadgeClass = (status) => {
  const color = getStatusColor(status);
  return `bg-${color}-100 text-${color}-800 border-${color}-300`;
};

// Calculate time ago
export const timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'just now';
};

// Validate email
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validate phone
export const isValidPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  const regex = /^(880)?01[3-9]\d{8}$/;
  return regex.test(cleaned);
};

// Calculate rating percentage
export const getRatingPercentage = (rating) => {
  return ((rating || 0) / 5) * 100;
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Parse query params
export const getQueryParams = (search) => {
  return new URLSearchParams(search);
};

// Build query string
export const buildQueryString = (params) => {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      query.append(key, params[key]);
    }
  });
  return query.toString();
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

// Download file
export const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Get avatar URL
export const getAvatarUrl = (name) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff&size=200`;
};

// Handle API error
export const handleApiError = (error) => {
  if (error.response) {
    return error.response.data.message || 'Something went wrong';
  }
  if (error.request) {
    return 'No response from server. Please check your connection.';
  }
  return error.message || 'An unexpected error occurred';
};

export default {
  formatDate,
  formatTime,
  formatCurrency,
  formatPhoneNumber,
  truncateText,
  getStatusColor,
  getStatusBadgeClass,
  timeAgo,
  isValidEmail,
  isValidPhone,
  getRatingPercentage,
  getInitials,
  getQueryParams,
  buildQueryString,
  debounce,
  copyToClipboard,
  downloadFile,
  getAvatarUrl,
  handleApiError,
};