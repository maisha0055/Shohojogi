import api from './api';

const loyaltyService = {
  // Get current user's loyalty information
  getMyLoyalty: async () => {
    try {
      const response = await api.get('/api/loyalty/me', {
        skipErrorHandling: true // Skip automatic error toast for this call
      });
      return response.data;
    } catch (error) {
      // Return a default response instead of throwing
      return {
        success: false,
        data: {
          loyalty_points: 0,
          loyalty_tier: 'Bronze'
        }
      };
    }
  },

  // Redeem loyalty points for discount
  redeemPoints: async (pointsToRedeem, bookingPrice) => {
    try {
      const response = await api.post('/api/loyalty/redeem', {
        points_to_redeem: pointsToRedeem,
        booking_price: bookingPrice
      }, {
        skipErrorHandling: true // Skip automatic error toast - we'll handle it in the component
      });
      return response.data;
    } catch (error) {
      // Re-throw with error details for component to handle
      throw error;
    }
  }
};

export default loyaltyService;

