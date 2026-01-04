// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
  
    // Log error for debugging
    console.error('Error:', err);
  
    // PostgreSQL unique constraint error
    if (err.code === '23505') {
      const field = err.detail.match(/\(([^)]+)\)/)[1];
      error.message = `${field} already exists`;
      error.statusCode = 400;
    }
  
    // PostgreSQL foreign key constraint error
    if (err.code === '23503') {
      error.message = 'Referenced resource not found';
      error.statusCode = 404;
    }
  
    // PostgreSQL check constraint violation (e.g., status check)
    if (err.code === '23514') {
      if (err.constraint === 'bookings_status_check') {
        error.message = 'Database configuration error: The booking status is not valid. Please contact support or run the database migration.';
      } else {
        error.message = `Database constraint violation: ${err.constraint || 'unknown constraint'}. ${err.message || ''}`;
      }
      error.statusCode = 400;
      console.error('[Database Constraint Error]', {
        code: err.code,
        constraint: err.constraint,
        message: err.message,
        detail: err.detail,
        hint: err.hint
      });
    }

    // PostgreSQL not null constraint error
    if (err.code === '23502') {
      const field = err.column;
      error.message = `${field} is required`;
      error.statusCode = 400;
    }
  
    // PostgreSQL invalid input syntax error (e.g., invalid UUID format)
    if (err.code === '22P02') {
      if (err.message && err.message.includes('uuid')) {
        error.message = 'Invalid ID format. Please refresh the page and try again.';
      } else {
        error.message = 'Invalid input format';
      }
      error.statusCode = 400;
    }
  
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      error.message = 'Invalid token';
      error.statusCode = 401;
    }
  
    if (err.name === 'TokenExpiredError') {
      error.message = 'Token expired';
      error.statusCode = 401;
    }
  
    // Validation errors
    if (err.name === 'ValidationError') {
      error.message = Object.values(err.errors).map(e => e.message).join(', ');
      error.statusCode = 400;
    }
  
    // Multer file upload errors
    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        error.message = 'File size too large. Maximum 5MB allowed';
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        error.message = 'Too many files uploaded';
      } else {
        error.message = 'File upload error';
      }
      error.statusCode = 400;
    }
  
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  };
  
  // Not found handler
  const notFound = (req, res, next) => {
    const error = new Error(`Route not found - ${req.originalUrl}`);
    res.status(404);
    next(error);
  };
  
  // Async handler to avoid try-catch blocks
  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
  
  module.exports = {
    errorHandler,
    notFound,
    asyncHandler
  };