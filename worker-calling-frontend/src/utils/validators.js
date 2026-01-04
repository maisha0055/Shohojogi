// Form validation utilities

// Validate email
export const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!regex.test(email)) return 'Invalid email format';
    return '';
  };
  
  // Validate password
  export const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };
  
  // Validate phone
  export const validatePhone = (phone) => {
    if (!phone) return 'Phone number is required';
    const cleaned = phone.replace(/\D/g, '');
    const regex = /^(880)?01[3-9]\d{8}$/;
    if (!regex.test(cleaned)) return 'Invalid Bangladesh phone number';
    return '';
  };
  
  // Validate required field
  export const validateRequired = (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return '';
  };
  
  // Validate name
  export const validateName = (name) => {
    if (!name) return 'Name is required';
    if (name.length < 2) return 'Name must be at least 2 characters';
    if (name.length > 100) return 'Name must not exceed 100 characters';
    return '';
  };
  
  // Validate rating
  export const validateRating = (rating) => {
    if (!rating) return 'Rating is required';
    if (rating < 1 || rating > 5) return 'Rating must be between 1 and 5';
    return '';
  };
  
  // Validate booking form
  export const validateBookingForm = (data) => {
    const errors = {};
  
    if (!data.service_description || !data.service_description.trim()) {
      errors.service_description = 'Service description is required';
    } else if (data.service_description.length < 10) {
      errors.service_description = 'Description must be at least 10 characters';
    }
  
    if (!data.service_location || !data.service_location.trim()) {
      errors.service_location = 'Service location is required';
    }
  
    if (data.booking_type === 'scheduled') {
      if (!data.scheduled_date) {
        errors.scheduled_date = 'Date is required for scheduled booking';
      }
      if (!data.scheduled_time) {
        errors.scheduled_time = 'Time is required for scheduled booking';
      }
    }
  
    return errors;
  };
  
  // Validate review form
  export const validateReviewForm = (data) => {
    const errors = {};
  
    const ratingError = validateRating(data.rating);
    if (ratingError) errors.rating = ratingError;
  
    if (data.comment && data.comment.length > 500) {
      errors.comment = 'Comment must not exceed 500 characters';
    }
  
    return errors;
  };
  
  // Validate registration form
  export const validateRegistrationForm = (data) => {
    const errors = {};
  
    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;
  
    const passwordError = validatePassword(data.password);
    if (passwordError) errors.password = passwordError;
  
    if (data.password !== data.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
  
    const nameError = validateName(data.full_name);
    if (nameError) errors.full_name = nameError;
  
    const phoneError = validatePhone(data.phone);
    if (phoneError) errors.phone = phoneError;
  
    return errors;
  };
  
  // Validate login form
  export const validateLoginForm = (data) => {
    const errors = {};
  
    const emailError = validateEmail(data.email);
    if (emailError) errors.email = emailError;
  
    const passwordError = validatePassword(data.password);
    if (passwordError) errors.password = passwordError;
  
    return errors;
  };
  
  // Check if form has errors
  export const hasErrors = (errors) => {
    return Object.keys(errors).length > 0;
  };
  
  // Get first error message
  export const getFirstError = (errors) => {
    const keys = Object.keys(errors);
    return keys.length > 0 ? errors[keys[0]] : '';
  };
  
  export default {
    validateEmail,
    validatePassword,
    validatePhone,
    validateRequired,
    validateName,
    validateRating,
    validateBookingForm,
    validateReviewForm,
    validateRegistrationForm,
    validateLoginForm,
    hasErrors,
    getFirstError,
  };