// Frontend Constants

export const BOOKING_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  };
  
  export const BOOKING_STATUS_LABELS = {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  
  export const BOOKING_TYPES = {
    INSTANT: 'instant',
    SCHEDULED: 'scheduled',
  };
  
  export const PAYMENT_METHODS = {
    CASH: 'cash',
    ONLINE: 'online',
  };
  
  export const USER_ROLES = {
    USER: 'user',
    WORKER: 'worker',
    ADMIN: 'admin',
  };
  
  export const AVAILABILITY_STATUS = {
    AVAILABLE: 'available',
    BUSY: 'busy',
    OFFLINE: 'offline',
  };
  
  export const LANGUAGES = {
    ENGLISH: 'en',
    BANGLA: 'bn',
  };
  
  export const RATING_VALUES = [1, 2, 3, 4, 5];
  
  export const SERVICE_CATEGORIES = [
    'Electrician',
    'Plumber',
    'Carpenter',
    'Mechanic',
    'Painter',
    'AC Technician',
    'Cleaning Service',
    'Key Maker',
    'Gardener',
    'Mason',
  ];
  
  export const DATE_FORMAT = 'MMM dd, yyyy';
  export const TIME_FORMAT = 'hh:mm a';
  export const DATETIME_FORMAT = 'MMM dd, yyyy hh:mm a';
  
  export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    WORKERS_PER_PAGE: 12,
    BOOKINGS_PER_PAGE: 10,
    MESSAGES_PER_PAGE: 50,
  };
  
  export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';
  
  export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    DASHBOARD: '/dashboard',
    WORKER_DASHBOARD: '/worker-dashboard',
    ADMIN: '/admin',
    WORKERS: '/workers',
    WORKER_DETAILS: '/workers/:id',
    BOOKING: '/booking/:workerId',
    BOOKINGS: '/bookings',
    CHAT: '/chat',
  };
  
  export const TOAST_CONFIG = {
    position: 'top-right',
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };
  
  export default {
    BOOKING_STATUS,
    BOOKING_STATUS_LABELS,
    BOOKING_TYPES,
    PAYMENT_METHODS,
    USER_ROLES,
    AVAILABILITY_STATUS,
    LANGUAGES,
    RATING_VALUES,
    SERVICE_CATEGORIES,
    DATE_FORMAT,
    TIME_FORMAT,
    DATETIME_FORMAT,
    PAGINATION,
    API_BASE_URL,
    ROUTES,
    TOAST_CONFIG,
  };