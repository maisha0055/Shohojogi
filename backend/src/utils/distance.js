/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
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
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
  };
  
  /**
   * Convert radians to degrees
   * @param {number} radians - Angle in radians
   * @returns {number} Angle in degrees
   */
  const toDegrees = (radians) => {
    return radians * (180 / Math.PI);
  };
  
  /**
   * Check if a point is within a given radius
   * @param {number} centerLat - Center latitude
   * @param {number} centerLon - Center longitude
   * @param {number} pointLat - Point latitude
   * @param {number} pointLon - Point longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {boolean} True if point is within radius
   */
  const isWithinRadius = (centerLat, centerLon, pointLat, pointLon, radiusKm) => {
    const distance = calculateDistance(centerLat, centerLon, pointLat, pointLon);
    return distance <= radiusKm;
  };
  
  /**
   * Get bounding box coordinates for a given center and radius
   * @param {number} lat - Center latitude
   * @param {number} lon - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {object} Bounding box {minLat, maxLat, minLon, maxLon}
   */
  const getBoundingBox = (lat, lon, radiusKm) => {
    const R = 6371; // Earth's radius in km
    const latRad = toRadians(lat);
    
    // Calculate angular distance
    const angularDistance = radiusKm / R;
    
    // Calculate latitude bounds
    const minLat = lat - toDegrees(angularDistance);
    const maxLat = lat + toDegrees(angularDistance);
    
    // Calculate longitude bounds
    const deltaLon = toDegrees(Math.asin(Math.sin(angularDistance) / Math.cos(latRad)));
    const minLon = lon - deltaLon;
    const maxLon = lon + deltaLon;
    
    return {
      minLat: parseFloat(minLat.toFixed(6)),
      maxLat: parseFloat(maxLat.toFixed(6)),
      minLon: parseFloat(minLon.toFixed(6)),
      maxLon: parseFloat(maxLon.toFixed(6))
    };
  };
  
  /**
   * Calculate bearing between two points
   * @param {number} lat1 - Start latitude
   * @param {number} lon1 - Start longitude
   * @param {number} lat2 - End latitude
   * @param {number} lon2 - End longitude
   * @returns {number} Bearing in degrees (0-360)
   */
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const dLon = toRadians(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRadians(lat2));
    const x = Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
              Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(dLon);
    const bearing = toDegrees(Math.atan2(y, x));
    
    return (bearing + 360) % 360;
  };
  
  /**
   * Format distance for display
   * @param {number} distanceKm - Distance in kilometers
   * @returns {string} Formatted distance string
   */
  const formatDistance = (distanceKm) => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)} km`;
    } else {
      return `${Math.round(distanceKm)} km`;
    }
  };
  
  module.exports = {
    calculateDistance,
    toRadians,
    toDegrees,
    isWithinRadius,
    getBoundingBox,
    calculateBearing,
    formatDistance
  };