const { PRICING } = require('../config/constants');
const { calculateDistance } = require('../utils/distance');

/**
 * Calculate estimated price for a booking
 * @param {object} params - Calculation parameters
 * @returns {number} Estimated price in BDT
 */
const calculateEstimatedPrice = (params) => {
  const {
    serviceCategoryId,
    workerLocation,
    serviceLocation,
    estimatedDuration = 1, // hours
    complexity = 'normal', // simple, normal, complex
  } = params;

  let basePrice = PRICING.BASE_PRICE;
  let totalPrice = basePrice;

  // Calculate distance if locations provided
  if (workerLocation && serviceLocation) {
    const distance = calculateDistance(
      workerLocation.latitude,
      workerLocation.longitude,
      serviceLocation.latitude,
      serviceLocation.longitude
    );
    
    totalPrice += distance * PRICING.PRICE_PER_KM;
  }

  // Add duration factor
  if (estimatedDuration > 1) {
    totalPrice += (estimatedDuration - 1) * (basePrice * 0.8);
  }

  // Complexity multiplier
  const complexityMultipliers = {
    simple: 0.8,
    normal: 1.0,
    complex: 1.3,
  };
  totalPrice *= complexityMultipliers[complexity] || 1.0;

  // Service category adjustments (optional)
  const categoryAdjustments = {
    // Add specific category multipliers if needed
    // 'electrician-uuid': 1.1,
    // 'plumber-uuid': 1.0,
  };

  if (serviceCategoryId && categoryAdjustments[serviceCategoryId]) {
    totalPrice *= categoryAdjustments[serviceCategoryId];
  }

  // Apply min/max constraints
  totalPrice = Math.max(PRICING.MIN_PRICE, totalPrice);
  totalPrice = Math.min(PRICING.MAX_PRICE, totalPrice);

  // Round to nearest 10 BDT
  totalPrice = Math.ceil(totalPrice / 10) * 10;

  return totalPrice;
};

/**
 * Calculate price breakdown
 * @param {number} totalPrice - Total calculated price
 * @param {object} params - Calculation parameters
 * @returns {object} Price breakdown
 */
const getPriceBreakdown = (totalPrice, params) => {
  const {
    distance = 0,
    estimatedDuration = 1,
  } = params;

  const basePrice = PRICING.BASE_PRICE;
  const distancePrice = distance * PRICING.PRICE_PER_KM;
  const durationPrice = estimatedDuration > 1 
    ? (estimatedDuration - 1) * (basePrice * 0.8)
    : 0;

  return {
    basePrice,
    distancePrice: Math.round(distancePrice),
    durationPrice: Math.round(durationPrice),
    totalPrice: Math.round(totalPrice),
    breakdown: {
      base: `Base service: ৳${basePrice}`,
      distance: distance > 0 ? `Distance (${distance.toFixed(1)}km): ৳${Math.round(distancePrice)}` : null,
      duration: estimatedDuration > 1 ? `Duration (${estimatedDuration}h): ৳${Math.round(durationPrice)}` : null,
    },
  };
};

/**
 * Calculate worker earnings (after platform commission)
 * @param {number} totalPrice - Total booking price
 * @param {number} commissionPercent - Platform commission percentage (default 15%)
 * @returns {object} Earnings breakdown
 */
const calculateWorkerEarnings = (totalPrice, commissionPercent = 15) => {
  const commission = (totalPrice * commissionPercent) / 100;
  const workerEarnings = totalPrice - commission;

  return {
    totalPrice,
    commission: Math.round(commission),
    workerEarnings: Math.round(workerEarnings),
    commissionPercent,
  };
};

/**
 * Calculate loyalty points for a booking
 * @param {number} totalPrice - Total booking price
 * @returns {number} Loyalty points earned
 */
const calculateLoyaltyPoints = (totalPrice) => {
  const { LOYALTY_POINTS } = require('../config/constants');
  // 1 point per 100 BDT
  return Math.floor(totalPrice / LOYALTY_POINTS.BOOKING_COMPLETED);
};

/**
 * Apply discount based on loyalty points
 * @param {number} totalPrice - Original price
 * @param {number} pointsToUse - Loyalty points to redeem
 * @param {number} conversionRate - Points to BDT rate (default 1 point = 1 BDT)
 * @returns {object} Discount details
 */
const applyLoyaltyDiscount = (totalPrice, pointsToUse, conversionRate = 1) => {
  const maxDiscountPercent = 20; // Maximum 20% discount
  const maxDiscount = (totalPrice * maxDiscountPercent) / 100;
  const discountAmount = Math.min(pointsToUse * conversionRate, maxDiscount);
  const finalPrice = totalPrice - discountAmount;

  return {
    originalPrice: totalPrice,
    pointsUsed: Math.floor(discountAmount / conversionRate),
    discountAmount: Math.round(discountAmount),
    finalPrice: Math.round(finalPrice),
  };
};

/**
 * Estimate completion time based on service type and location
 * @param {object} params - Estimation parameters
 * @returns {object} Time estimation
 */
const estimateCompletionTime = (params) => {
  const {
    serviceCategoryId,
    complexity = 'normal',
    distance = 0,
  } = params;

  // Base completion times in hours by complexity
  const baseTimes = {
    simple: 1,
    normal: 2,
    complex: 4,
  };

  const baseTime = baseTimes[complexity] || 2;
  
  // Add travel time (assuming 30 km/h average speed in city)
  const travelTime = distance / 30;
  
  const totalTime = baseTime + travelTime;

  return {
    estimatedHours: parseFloat(totalTime.toFixed(1)),
    travelTime: parseFloat(travelTime.toFixed(1)),
    workTime: baseTime,
    estimatedCompletion: new Date(Date.now() + totalTime * 60 * 60 * 1000),
  };
};

module.exports = {
  calculateEstimatedPrice,
  getPriceBreakdown,
  calculateWorkerEarnings,
  calculateLoyaltyPoints,
  applyLoyaltyDiscount,
  estimateCompletionTime,
};