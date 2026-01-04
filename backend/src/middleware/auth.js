const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/database');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please login.'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please login again.'
      });
    }

    // Get user from database
    const result = await query(
      'SELECT id, email, full_name, phone, role, is_verified, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.'
      });
    }

    const user = result.rows[0];

    // Allow inactive workers to access all routes except job/booking related features
    // Only block inactive non-worker users
    const blockedInactiveRoutes = [
      '/api/bookings/accept',
      '/api/bookings/start',
      '/api/bookings/complete'
      // Note: /api/workers/availability is now allowed for all workers
    ];
    
    const isBlockedRoute = blockedInactiveRoutes.some(route => req.path.startsWith(route));
    
    // Block inactive non-worker users from all routes
    if (!user.is_active && user.role !== 'worker') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }
    
    // For inactive workers, only block job/booking related routes
    if (!user.is_active && user.role === 'worker' && isBlockedRoute) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please complete NID verification and wait for admin activation to receive jobs.'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Flatten roles array in case an array was passed
    const allowedRoles = roles.flat();
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route. Allowed roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Check if user is verified (for workers - legacy)
const checkVerified = (req, res, next) => {
  if (!req.user.is_verified && req.user.role === 'worker') {
    return res.status(403).json({
      success: false,
      message: 'Please complete your verification process to access this feature'
    });
  }
  next();
};

// Check if user has NID verification (for all users)
const checkNIDVerified = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get user's NID verification status
    const { query } = require('../config/database');
    const result = await query(
      `SELECT nid_verification_status, is_verified 
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    // Check if NID is verified
    if (user.nid_verification_status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'NID verification is required to access this feature. Please complete your NID verification.',
        verification_status: user.nid_verification_status || 'not_submitted'
      });
    }

    next();
  } catch (error) {
    console.error('NID verification check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking verification status'
    });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = verifyToken(token);
      
      if (decoded) {
        const result = await query(
          'SELECT id, email, full_name, phone, role, is_verified, is_active FROM users WHERE id = $1',
          [decoded.id]
        );

        if (result.rows.length > 0) {
          req.user = result.rows[0];
        }
      }
    }

    next();
  } catch (error) {
    // Don't throw error, just continue without user
    next();
  }
};

module.exports = {
  protect,
  authorize,
  checkVerified,
  checkNIDVerified,
  optionalAuth
};