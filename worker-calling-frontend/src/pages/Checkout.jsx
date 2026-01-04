import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import bookingService from '../services/bookingService';
import loyaltyService from '../services/loyaltyService';
import { toast } from 'react-toastify';
import Loader from '../components/common/Loader';

const Checkout = () => {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(null);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [loyaltyInfo, setLoyaltyInfo] = useState(null);

  const total = getCartTotal();

  // Fetch loyalty info on mount - MUST be before any conditional returns
  useEffect(() => {
    const fetchLoyaltyInfo = async () => {
      if (user && user.role === 'user') {
        try {
          const response = await loyaltyService.getMyLoyalty();
          if (response.success) {
            setLoyaltyInfo(response.data);
          }
        } catch (error) {
          console.error('Error fetching loyalty info:', error);
          // Silently fail - use user data from context as fallback
          // Don't show error toast to avoid annoying users
        }
      }
    };
    
    // Only fetch if user is available
    if (user) {
      fetchLoyaltyInfo();
    }
  }, [user]);

  // Calculate loyalty discount when points change - MUST be before any conditional returns
  useEffect(() => {
    const calculateDiscount = async () => {
      // Only calculate if user wants to use points and has valid inputs
      if (useLoyaltyPoints && pointsToRedeem > 0 && total > 0) {
        try {
          const response = await loyaltyService.redeemPoints(pointsToRedeem, total);
          if (response.success) {
            setLoyaltyDiscount(response.data.discount_amount);
          } else {
            setLoyaltyDiscount(0);
          }
        } catch (error) {
          console.error('Error calculating discount:', error);
          // Don't show error toast on initial load, only on user interaction
          if (useLoyaltyPoints) {
            toast.error(error.response?.data?.message || 'Error calculating discount');
          }
          setLoyaltyDiscount(0);
        }
      } else {
        setLoyaltyDiscount(0);
      }
    };
    
    // Only run if we have all required data
    if (total > 0) {
      calculateDiscount();
    }
  }, [useLoyaltyPoints, pointsToRedeem, total]);

  // Early return AFTER all hooks - this is the correct pattern
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <button onClick={() => navigate('/cart')} className="btn-primary">
            Go to Cart
          </button>
        </div>
      </div>
    );
  }

  const availablePoints = loyaltyInfo?.loyalty_points || user?.loyalty_points || 0;
  const finalTotal = Math.max(0, total - loyaltyDiscount);

  const handleCheckout = async () => {
    if (!user || user.role !== 'user') {
      toast.error('Please login as a user to checkout');
      navigate('/login');
      return;
    }

    setProcessing(true);

    try {
      // Create bookings for all items (both cash and online - payment happens after job completion)
      let successCount = 0;

      for (let i = 0; i < cartItems.length; i++) {
        const item = cartItems[i];
        setProcessingIndex(i);
        
        try {
          // For call_worker bookings, use selectWorker API instead of createBooking
          if (item.booking_type === 'call_worker' && item.booking_id) {
            const response = await bookingService.selectWorker(item.booking_id, item.worker_id);
            
            if (response.success) {
              successCount++;
              // Store points_to_redeem preference for this booking if user selected points
              // selectWorker returns { booking, worker_estimate }, so use booking.id
              const bookingId = response.data?.booking?.id || item.booking_id;
              if (useLoyaltyPoints && pointsToRedeem > 0 && bookingId) {
                localStorage.setItem(`loyalty_points_${bookingId}`, String(pointsToRedeem));
              }
            }
          } else {
            // For normal bookings (instant/scheduled), use createBooking
            const bookingData = {
              worker_id: item.worker_id,
              service_category_id: item.service_category_id,
              booking_type: item.scheduled_date ? 'scheduled' : 'instant',
              service_description: item.service_description,
              service_location: item.service_location,
              location_latitude: item.location_latitude,
              location_longitude: item.location_longitude,
              scheduled_date: item.scheduled_date || null,
              scheduled_time: item.scheduled_time || null,
              payment_method: item.payment_method // Store payment method, but don't process payment yet
            };

            const response = await bookingService.createBooking(bookingData);
            
            if (response.success) {
              successCount++;
              // Store points_to_redeem preference for this booking if user selected points
              if (useLoyaltyPoints && pointsToRedeem > 0 && response.data?.id) {
                localStorage.setItem(`loyalty_points_${response.data.id}`, String(pointsToRedeem));
              }
            }
          }
        } catch (error) {
          console.error(`Error booking worker ${item.worker_name}:`, error);
        }
      }

      if (successCount > 0) {
        clearCart();
        const paymentMethodName = cartItems[0]?.payment_method === 'cash' ? 'Cash on Delivery' :
                                  cartItems[0]?.payment_method === 'online' ? 'Online Payment (Pay after work completion)' : 'selected method';
        toast.success(`Successfully booked ${successCount} service(s)! ${paymentMethodName === 'Cash on Delivery' ? 'You will pay in cash when the service is completed.' : 'You will be able to pay after the worker completes the job.'}`);
        navigate('/bookings');
      } else {
        toast.error('Failed to complete bookings. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('An error occurred during checkout');
    } finally {
      setProcessing(false);
      setProcessingIndex(null);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/cart')}
            className="text-primary-600 hover:text-primary-700 mb-4"
          >
            ← Back to Cart
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="mt-2 text-gray-600">Review your order and complete the booking</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Details</h2>
              
              {cartItems.map((item, index) => (
                <div key={item.id} className={`border-b border-gray-200 pb-4 mb-4 last:border-0 last:mb-0 ${processingIndex === index ? 'opacity-50' : ''}`}>
                  <div className="flex items-start space-x-4">
                    {item.worker_photo ? (
                      <img
                        src={item.worker_photo}
                        alt={item.worker_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary-600">
                          {item.worker_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.worker_name}</h3>
                      <p className="text-sm text-gray-600">{item.worker_category}</p>
                      
                      <div className="mt-2 space-y-1 text-sm text-gray-700">
                        <div><strong>Service:</strong> {item.service_description}</div>
                        <div><strong>Location:</strong> {item.service_location}</div>
                        {item.scheduled_date && item.scheduled_time && (
                          <div><strong>Schedule:</strong> {item.scheduled_date} at {item.scheduled_time}</div>
                        )}
                        <div><strong>Payment Method:</strong> {item.payment_method}</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary-600">
                        ৳{parseFloat(item.estimated_price || 0).toFixed(2)}
                      </div>
                      {processingIndex === index && (
                        <div className="text-xs text-gray-500 mt-1">Processing...</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* User Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-2 text-gray-700">
                <div><strong>Name:</strong> {user?.full_name}</div>
                <div><strong>Email:</strong> {user?.email}</div>
                <div><strong>Phone:</strong> {user?.phone}</div>
              </div>
            </div>

            {/* Payment Method Display */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                {cartItems.length > 0 && cartItems[0].payment_method && (
                  <div className="p-4 border-2 border-primary-400 bg-primary-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                      <div className="text-2xl">
                        {cartItems[0].payment_method === 'cash' && '💰'}
                        {cartItems[0].payment_method === 'online' && '💳'}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                          {cartItems[0].payment_method === 'cash' && 'Cash on Delivery'}
                          {cartItems[0].payment_method === 'online' && 'Online Payment'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {cartItems[0].payment_method === 'cash' && 'Pay when service is completed'}
                          {cartItems[0].payment_method === 'online' && 'You will select payment gateway (bKash/SSL) after work completion'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  {cartItems[0]?.payment_method === 'cash' ? (
                    <>💵 Payment will be collected in cash when the service is completed.</>
                  ) : (
                    <>💳 After the worker completes the job, you'll receive a notification and can then pay using bKash or SSLCommerz.</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
              
              {/* Loyalty Points Section */}
              {user?.role === 'user' && availablePoints > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useLoyaltyPoints}
                        onChange={(e) => {
                          setUseLoyaltyPoints(e.target.checked);
                          if (!e.target.checked) {
                            setPointsToRedeem(0);
                          } else {
                            // Default to max available points
                            setPointsToRedeem(Math.min(availablePoints, Math.floor((total * 0.20) / 50) * 10));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Use Loyalty Points
                      </span>
                    </label>
                    <span className="text-sm text-gray-600">
                      ⭐ {availablePoints} points available
                    </span>
                  </div>
                  
                  {useLoyaltyPoints && (
                    <div className="mt-3 space-y-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Points to redeem (10 points = 50 BDT, max 20% discount)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={availablePoints}
                          step="10"
                          value={pointsToRedeem}
                          onChange={(e) => {
                            const value = Math.min(availablePoints, Math.max(0, parseInt(e.target.value) || 0));
                            setPointsToRedeem(value);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      {loyaltyDiscount > 0 && (
                        <div className="text-sm text-green-600 font-semibold">
                          Discount: -৳{loyaltyDiscount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cartItems.length} items)</span>
                  <span>৳{total.toFixed(2)}</span>
                </div>
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Loyalty Discount</span>
                    <span>-৳{loyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Service Fee</span>
                  <span>৳0.00</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span>৳{finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full btn-primary text-lg py-3 disabled:opacity-50"
              >
                {processing ? (
                  <span className="flex items-center justify-center">
                    <Loader />
                    <span className="ml-2">Processing...</span>
                  </span>
                ) : (
                  'Complete Booking'
                )}
              </button>
              
              <button
                onClick={() => navigate('/cart')}
                disabled={processing}
                className="w-full btn-secondary mt-3 disabled:opacity-50"
              >
                Back to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

