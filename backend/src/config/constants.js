// Application Constants

// User Roles
const USER_ROLES = {
    USER: 'user',
    WORKER: 'worker',
    ADMIN: 'admin',
  };
  
  // Booking Status
  const BOOKING_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  };
  
  // Booking Types
  const BOOKING_TYPES = {
    INSTANT: 'instant',
    SCHEDULED: 'scheduled',
  };
  
  // Payment Methods
  const PAYMENT_METHODS = {
    CASH: 'cash',
    ONLINE: 'online',
  };
  
  // Payment Status
  const PAYMENT_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    REFUNDED: 'refunded',
  };
  
  // Worker Availability Status
  const AVAILABILITY_STATUS = {
    AVAILABLE: 'available',
    BUSY: 'busy',
    OFFLINE: 'offline',
  };
  
  // Worker Verification Status
  const VERIFICATION_STATUS = {
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
  };
  
  // Report Status
  const REPORT_STATUS = {
    PENDING: 'pending',
    INVESTIGATING: 'investigating',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed',
  };
  
  // Notification Types
  const NOTIFICATION_TYPES = {
    BOOKING: 'booking',
    PAYMENT: 'payment',
    REVIEW: 'review',
    MESSAGE: 'message',
    SYSTEM: 'system',
  };
  
  // Languages
  const LANGUAGES = {
    ENGLISH: 'en',
    BANGLA: 'bn',
  };
  
  // File Upload
  const FILE_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png'],
  };
  
  // Pricing
  const PRICING = {
    BASE_PRICE: 200, // Base service price in BDT
    PRICE_PER_KM: 50, // Price per kilometer in BDT
    MIN_PRICE: 150, // Minimum booking price
    MAX_PRICE: 10000, // Maximum booking price
  };
  
  // Loyalty Points
  const LOYALTY_POINTS = {
    REGISTRATION: 50,
    BOOKING_CREATED: 10,
    BOOKING_COMPLETED: 100, // Points per 100 BDT spent
    REVIEW_SUBMITTED: 5,
    REFERRAL: 200,
  };
  
  // Pagination
  const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  };
  
  // Distance
  const DISTANCE = {
    DEFAULT_RADIUS: 10, // km
    MAX_RADIUS: 50, // km
  };
  
  // Rating
  const RATING = {
    MIN: 1,
    MAX: 5,
  };
  
  // OTP
  const OTP = {
    LENGTH: 6,
    EXPIRY: 10 * 60 * 1000, // 10 minutes in milliseconds
  };
  
  // JWT
  const JWT = {
    ACCESS_TOKEN_EXPIRY: '7d',
    REFRESH_TOKEN_EXPIRY: '30d',
  };
  
  // Email Templates
  const EMAIL_SUBJECTS = {
    WELCOME: 'Welcome to WorkerCall',
    BOOKING_CREATED: 'Booking Confirmation',
    BOOKING_ACCEPTED: 'Booking Accepted',
    BOOKING_COMPLETED: 'Service Completed',
    VERIFICATION_APPROVED: 'Account Verified',
    PASSWORD_RESET: 'Password Reset Request',
  };
  
  // SMS Templates
  const SMS_TEMPLATES = {
    BOOKING_REMINDER: 'Reminder: Your booking is scheduled for {date} at {time}',
    OTP_VERIFICATION: 'Your verification code is: {otp}',
  };
  
  // Error Messages
  const ERROR_MESSAGES = {
    UNAUTHORIZED: 'You are not authorized to access this resource',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    SERVER_ERROR: 'Internal server error',
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_EXISTS: 'User already exists',
    WORKER_NOT_AVAILABLE: 'Worker is not available',
    BOOKING_NOT_FOUND: 'Booking not found',
    PAYMENT_FAILED: 'Payment processing failed',
  };
  
  // Success Messages
  const SUCCESS_MESSAGES = {
    REGISTRATION_SUCCESS: 'Registration successful',
    LOGIN_SUCCESS: 'Login successful',
    BOOKING_CREATED: 'Booking created successfully',
    BOOKING_UPDATED: 'Booking updated successfully',
    PAYMENT_SUCCESS: 'Payment successful',
    PROFILE_UPDATED: 'Profile updated successfully',
  };
  
  // Regex Patterns
  const REGEX_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^(\+88)?01[3-9]\d{8}$/,
    NID: /^\d{10}$|^\d{13}$|^\d{17}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
  };
  
  module.exports = {
    USER_ROLES,
    BOOKING_STATUS,
    BOOKING_TYPES,
    PAYMENT_METHODS,
    PAYMENT_STATUS,
    AVAILABILITY_STATUS,
    VERIFICATION_STATUS,
    REPORT_STATUS,
    NOTIFICATION_TYPES,
    LANGUAGES,
    FILE_UPLOAD,
    PRICING,
    LOYALTY_POINTS,
    PAGINATION,
    DISTANCE,
    RATING,
    OTP,
    JWT,
    EMAIL_SUBJECTS,
    SMS_TEMPLATES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    REGEX_PATTERNS,
  };