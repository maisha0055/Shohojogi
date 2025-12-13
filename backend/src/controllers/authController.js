const bcrypt = require("bcrypt");
const { query } = require("../config/database");
const { generateToken } = require("../utils/jwt");
const { asyncHandler } = require("../middleware/errorHandler");

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const {
    email,
    password,
    full_name,
    phone,
    role = "user",
    address,
    latitude,
    longitude,
    preferred_language = "en",
  } = req.body;

  // Validation
  if (!email || !password || !full_name || !phone) {
    return res.status(400).json({
      success: false,
      message:
        "Please provide all required fields: email, password, full_name, phone",
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  // Validate phone format (Bangladesh)
  const phoneRegex = /^(\+88)?01[3-9]\d{8}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid Bangladesh phone number",
    });
  }

  // Check if user already exists
  const existingUser = await query(
    "SELECT id FROM users WHERE email = $1 OR phone = $2",
    [email.toLowerCase(), phone]
  );

  if (existingUser.rows.length > 0) {
    return res.status(400).json({
      success: false,
      message: "User with this email or phone already exists",
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Insert user using snake_case column names
  const result = await query(
    `INSERT INTO users (
      email, password, full_name, phone, role, address, latitude, longitude, preferred_language
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, email, full_name, phone, role, created_at`,
    [
      email.toLowerCase(),
      hashedPassword,
      full_name,
      phone,
      role,
      address || null,
      latitude || null,
      longitude || null,
      preferred_language,
    ]
  );

  const user = result.rows[0];

  // If registering as worker, create worker profile
  if (role === "worker") {
    await query(`INSERT INTO worker_profiles (user_id) VALUES ($1)`, [user.id]);
  }

  // Generate token
  const token = generateToken({ id: user.id, role: user.role });

  res.status(201).json({
    success: true,
    message: "Registration successful",
    data: {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        preferred_language: user.preferred_language,
        created_at: user.created_at,
      },
      token,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide email and password",
    });
  }

  // Get user from database
  const result = await query(
    `SELECT u.*, 
      CASE 
        WHEN u.role = 'worker' THEN 
          json_build_object(
            'availability_status', wp.availability_status,
            'verification_status', wp.verification_status,
            'average_rating', wp.average_rating,
            'total_reviews', wp.total_reviews
          )
        ELSE NULL
      END as worker_info
    FROM users u
    LEFT JOIN worker_profiles wp ON u.id = wp.user_id
    WHERE u.email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const user = result.rows[0];

  // Check if account is active
  if (!user.is_active) {
    return res.status(403).json({
      success: false,
      message: "Your account has been deactivated. Please contact support.",
    });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Generate token
  const token = generateToken({ id: user.id, role: user.role });

  // Remove password from response
  delete user.password;

  res.json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        profile_photo: user.profile_photo,
        address: user.address,
        preferred_language: user.preferred_language || null,
        is_verified: user.is_verified || false,
        loyalty_points: user.loyalty_points || 0,
        worker_info: user.worker_info,
        created_at: user.created_at,
      },
      token,
    },
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT u.*,
      CASE 
        WHEN u.role = 'worker' THEN 
          json_build_object(
            'id', wp.id,
            'service_category_id', wp.service_category_id,
            'experience_years', wp.experience_years,
            'hourly_rate', wp.hourly_rate,
            'bio', wp.bio,
            'skills', wp.skills,
            'availability_status', wp.availability_status,
            'verification_status', wp.verification_status,
            'average_rating', wp.average_rating,
            'total_reviews', wp.total_reviews,
            'total_jobs_completed', wp.total_jobs_completed
          )
        ELSE NULL
      END as worker_profile
    FROM users u
    LEFT JOIN worker_profiles wp ON u.id = wp.user_id
    WHERE u.id = $1`,
    [req.user.id]
  );

  const user = result.rows[0];
  delete user.password;

  res.json({
    success: true,
    data: user,
  });
});

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Please provide current and new password",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 6 characters long",
    });
  }

  // Get user with password
  const result = await query("SELECT password FROM users WHERE id = $1", [
    req.user.id,
  ]);

  const user = result.rows[0];

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update password
  await query(
    "UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
    [hashedPassword, req.user.id]
  );

  res.json({
    success: true,
    message: "Password updated successfully",
  });
});

// @desc    Forgot password (send reset link)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Please provide email address",
    });
  }

  // Check if user exists
  const result = await query(
    "SELECT id, email, full_name FROM users WHERE email = $1",
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No user found with this email",
    });
  }

  // Generate reset token (expires in 1 hour)
  const resetToken = generateToken({ id: result.rows[0].id }, "1h");

  // TODO: Send email with reset link
  // For now, just return the token (in production, send via email)

  res.json({
    success: true,
    message: "Password reset link sent to email",
    // Remove this in production
    resetToken: resetToken,
  });
});

module.exports = {
  register,
  login,
  getMe,
  updatePassword,
  forgotPassword,
};
