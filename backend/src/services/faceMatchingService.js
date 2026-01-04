/**
 * Face Matching Service
 * Compares face descriptors using Euclidean distance
 */

/**
 * Calculate Euclidean distance between two face descriptors
 * @param {Array} descriptor1 - First face descriptor (128-dimensional array)
 * @param {Array} descriptor2 - Second face descriptor (128-dimensional array)
 * @returns {number} Euclidean distance (lower = more similar)
 */
const calculateEuclideanDistance = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2) {
    return Infinity; // Maximum distance if either is missing
  }

  if (descriptor1.length !== descriptor2.length) {
    console.warn('[Face Matching] Descriptors have different lengths');
    return Infinity;
  }

  let sumSquaredDiffs = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sumSquaredDiffs += diff * diff;
  }

  return Math.sqrt(sumSquaredDiffs);
};

/**
 * Check if two faces match based on Euclidean distance
 * @param {Array} descriptor1 - First face descriptor
 * @param {Array} descriptor2 - Second face descriptor
 * @param {number} threshold - Maximum distance for a match (default: 0.6)
 * @returns {object} Match result with distance and matched status
 */
const compareFaces = (descriptor1, descriptor2, threshold = 0.6) => {
  const distance = calculateEuclideanDistance(descriptor1, descriptor2);
  const matched = distance < threshold;

  return {
    matched,
    distance: parseFloat(distance.toFixed(4)),
    threshold,
    confidence: matched 
      ? Math.max(0, Math.min(100, Math.round((1 - distance / threshold) * 100)))
      : 0
  };
};

/**
 * Perform three-way face matching
 * @param {object} descriptors - Object containing all face descriptors
 * @param {Array} selfieDescriptor - Live selfie face descriptor
 * @param {Array} profileDescriptor - Profile photo face descriptor (optional)
 * @param {Array} nidDescriptor - NID photo face descriptor (optional)
 * @param {number} threshold - Maximum distance for a match (default: 0.6)
 * @returns {object} Matching results
 */
const performThreeWayMatch = (selfieDescriptor, profileDescriptor, nidDescriptor, threshold = 0.6) => {
  const results = {
    selfie_to_profile: null,
    selfie_to_nid: null,
    profile_to_nid: null,
    all_matched: false,
    overall_confidence: 0
  };

  // Match selfie with profile photo
  if (profileDescriptor) {
    results.selfie_to_profile = compareFaces(selfieDescriptor, profileDescriptor, threshold);
  }

  // Match selfie with NID photo
  if (nidDescriptor) {
    results.selfie_to_nid = compareFaces(selfieDescriptor, nidDescriptor, threshold);
  }

  // Match profile with NID (if both available)
  if (profileDescriptor && nidDescriptor) {
    results.profile_to_nid = compareFaces(profileDescriptor, nidDescriptor, threshold);
  }

  // Determine if all matches are successful
  const matches = [];
  if (results.selfie_to_profile) matches.push(results.selfie_to_profile.matched);
  if (results.selfie_to_nid) matches.push(results.selfie_to_nid.matched);
  if (results.profile_to_nid) matches.push(results.profile_to_nid.matched);

  results.all_matched = matches.length > 0 && matches.every(match => match === true);
  
  // Calculate overall confidence
  const confidences = [];
  if (results.selfie_to_profile) confidences.push(results.selfie_to_profile.confidence);
  if (results.selfie_to_nid) confidences.push(results.selfie_to_nid.confidence);
  if (results.profile_to_nid) confidences.push(results.profile_to_nid.confidence);
  
  results.overall_confidence = confidences.length > 0
    ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
    : 0;

  return results;
};

/**
 * Validate face descriptor format
 * @param {any} descriptor - Face descriptor to validate
 * @returns {boolean} True if valid
 */
const isValidDescriptor = (descriptor) => {
  if (!descriptor) return false;
  if (!Array.isArray(descriptor)) return false;
  if (descriptor.length !== 128) return false;
  return descriptor.every(val => typeof val === 'number' && !isNaN(val));
};

module.exports = {
  calculateEuclideanDistance,
  compareFaces,
  performThreeWayMatch,
  isValidDescriptor
};


