const { body, param, query, validationResult } = require('express-validator');
const { REGEX_PATTERNS } = require('../config/constants');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Registration validation
const validateRegistration = [
  body('email')
    .trim()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .trim()
    .matches(REGEX_PATTERNS.PHONE).withMessage('Valid Bangladesh phone number is required'),
  body('role')
    .optional()
    .isIn(['user', 'worker']).withMessage('Role must be either user or worker'),
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email')
    .trim()
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Update password validation
const validatePasswordUpdate = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors
];

// Booking validation
const validateBooking = [
  body('worker_id')
    .notEmpty().withMessage('Worker ID is required')
    .isUUID().withMessage('Invalid worker ID'),
  body('booking_type')
    .notEmpty().withMessage('Booking type is required')
    .isIn(['instant', 'scheduled']).withMessage('Invalid booking type'),
  body('service_description')
    .trim()
    .notEmpty().withMessage('Service description is required')
    .isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('service_location')
    .trim()
    .notEmpty().withMessage('Service location is required'),
  body('scheduled_date')
    .if(body('booking_type').equals('scheduled'))
    .notEmpty().withMessage('Scheduled date is required for scheduled bookings')
    .isISO8601().withMessage('Invalid date format'),
  body('scheduled_time')
    .if(body('booking_type').equals('scheduled'))
    .notEmpty().withMessage('Scheduled time is required for scheduled bookings'),
  body('payment_method')
    .optional()
    .isIn(['cash', 'online']).withMessage('Invalid payment method'),
  handleValidationErrors
];

// Review validation
const validateReview = [
  body('booking_id')
    .notEmpty().withMessage('Booking ID is required')
    .isUUID().withMessage('Invalid booking ID'),
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Comment must not exceed 500 characters'),
  handleValidationErrors
];

// Worker profile validation
const validateWorkerProfile = [
  body('service_category_id')
    .optional()
    .isUUID().withMessage('Invalid service category ID'),
  body('experience_years')
    .optional()
    .isInt({ min: 0, max: 50 }).withMessage('Experience must be between 0 and 50 years'),
  body('hourly_rate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Hourly rate must be a positive number'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Bio must not exceed 1000 characters'),
  handleValidationErrors
];

// NID verification validation
const validateNIDSubmission = [
  body('nid_number')
    .notEmpty().withMessage('NID number is required')
    .matches(REGEX_PATTERNS.NID).withMessage('Invalid NID number format'),
  body('nid_image_url')
    .notEmpty().withMessage('NID image is required')
    .isURL().withMessage('Invalid image URL'),
  handleValidationErrors
];

// UUID param validation
const validateUUID = (paramName) => [
  param(paramName)
    .isUUID().withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// Message validation
const validateMessage = [
  body('receiver_id')
    .notEmpty().withMessage('Receiver ID is required')
    .isUUID().withMessage('Invalid receiver ID'),
  body('message_text')
    .trim()
    .notEmpty().withMessage('Message text is required')
    .isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  handleValidationErrors
];

// Report validation
const validateReport = [
  body('reported_user_id')
    .notEmpty().withMessage('Reported user ID is required')
    .isUUID().withMessage('Invalid user ID'),
  body('reason')
    .trim()
    .notEmpty().withMessage('Reason is required')
    .isLength({ min: 5, max: 100 }).withMessage('Reason must be between 5 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validatePasswordUpdate,
  validateBooking,
  validateReview,
  validateWorkerProfile,
  validateNIDSubmission,
  validateUUID,
  validatePagination,
  validateMessage,
  validateReport,
  handleValidationErrors,
};