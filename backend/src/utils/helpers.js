/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return parseFloat(distance.toFixed(2));
  };
  
  /**
   * Convert degrees to radians
   */
  const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
  };
  
  /**
   * Calculate estimated price based on distance and service type
   * @param {number} distance_km - Distance in kilometers
   * @param {string} service_category_id - Service category ID (optional)
   * @returns {number} Estimated price
   */
  const calculatePrice = (distance_km, service_category_id = null) => {
    const basePrice = parseFloat(process.env.BASE_SERVICE_PRICE || 200);
    const pricePerKm = parseFloat(process.env.PRICE_PER_KM || 50);
    
    // Base calculation
    let price = basePrice + (distance_km * pricePerKm);
    
    // Service category multipliers (optional enhancement)
    const categoryMultipliers = {
      // Add specific multipliers if needed
      // 'electrician': 1.2,
      // 'plumber': 1.1,
    };
    
    // Round to nearest 10 taka
    price = Math.ceil(price / 10) * 10;
    
    return price;
  };
  
  /**
   * Format phone number to Bangladesh standard
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number
   */
  const formatPhoneNumber = (phone) => {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Add +88 if not present
    if (!cleaned.startsWith('88') && cleaned.length === 11) {
      cleaned = '88' + cleaned;
    }
    
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  };
  
  /**
   * Generate booking number
   * @returns {string} Unique booking number
   */
  const generateBookingNumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `BK${timestamp}${random}`;
  };
  
  /**
   * Calculate rating statistics
   * @param {Array} reviews - Array of review objects
   * @returns {object} Rating statistics
   */
  const calculateRatingStats = (reviews) => {
    if (!reviews || reviews.length === 0) {
      return {
        average: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }
    
    const total = reviews.length;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    const average = (sum / total).toFixed(2);
    
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      distribution[review.rating]++;
    });
    
    return { average: parseFloat(average), total, distribution };
  };
  
  /**
   * Paginate array
   * @param {Array} array - Array to paginate
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {object} Paginated result
   */
  const paginate = (array, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    const paginatedItems = array.slice(offset, offset + limit);
    const totalPages = Math.ceil(array.length / limit);
    
    return {
      data: paginatedItems,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: array.length,
        itemsPerPage: parseInt(limit),
        hasMore: page < totalPages
      }
    };
  };
  
  /**
   * Validate Bangladesh NID number
   * @param {string} nid - NID number
   * @returns {boolean} Is valid
   */
  const isValidNID = (nid) => {
    const cleaned = nid.replace(/\D/g, '');
    return [10, 13, 17].includes(cleaned.length);
  };
  
  /**
   * Validate Bangladesh phone number
   * @param {string} phone - Phone number
   * @returns {boolean} Is valid
   */
  const isValidPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    const pattern = /^(88)?01[3-9]\d{8}$/;
    return pattern.test(cleaned);
  };
  
  /**
   * Format date to Bangladesh timezone
   * @param {Date} date - Date object
   * @returns {string} Formatted date
   */
  const formatDateBD = (date) => {
    return new Date(date).toLocaleString('en-BD', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  /**
   * Sanitize user input
   * @param {string} input - User input
   * @returns {string} Sanitized input
   */
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .slice(0, 1000); // Limit length
  };
  
  /**
   * Check if time slot is available
   * @param {string} date - Date string
   * @param {string} time - Time string
   * @returns {boolean} Is available
   */
  const isTimeSlotAvailable = (date, time) => {
    const bookingDate = new Date(`${date} ${time}`);
    const now = new Date();
    
    // Must be at least 2 hours in the future
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    return bookingDate > twoHoursFromNow;
  };
  
  /**
   * Generate random verification code
   * @param {number} length - Code length
   * @returns {string} Verification code
   */
  const generateVerificationCode = (length = 6) => {
    return Math.floor(Math.random() * Math.pow(10, length))
      .toString()
      .padStart(length, '0');
  };
  
  module.exports = {
    calculateDistance,
    calculatePrice,
    formatPhoneNumber,
    generateBookingNumber,
    calculateRatingStats,
    paginate,
    isValidNID,
    isValidPhone,
    formatDateBD,
    sanitizeInput,
    isTimeSlotAvailable,
    generateVerificationCode
  };