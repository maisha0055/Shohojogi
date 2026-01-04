import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import Loader from '../components/common/Loader';
import loyaltyService from '../services/loyaltyService';

const ShopCheckout = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [loyaltyInfo, setLoyaltyInfo] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
      fetchLoyaltyInfo();
    } else {
      setLoading(false);
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/cart');
      if (response.data.success) {
        setCartItems(response.data.data.items || []);
        if (response.data.data.items.length === 0) {
          navigate('/shop-cart');
        }
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoyaltyInfo = async () => {
    if (user && user.role === 'user') {
      try {
        const response = await loyaltyService.getMyLoyalty();
        if (response.success) {
          setLoyaltyInfo(response.data);
        }
      } catch (error) {
        console.error('Error fetching loyalty info:', error);
      }
    }
  };

  useEffect(() => {
    const calculateDiscount = async () => {
      if (useLoyaltyPoints && pointsToRedeem > 0 && getSubtotal() > 0) {
        try {
          const response = await loyaltyService.redeemPoints(pointsToRedeem, getSubtotal());
          if (response.success) {
            setLoyaltyDiscount(response.data.discount_amount);
          } else {
            setLoyaltyDiscount(0);
          }
        } catch (error) {
          setLoyaltyDiscount(0);
        }
      } else {
        setLoyaltyDiscount(0);
      }
    };
    
    if (getSubtotal() > 0) {
      calculateDiscount();
    }
  }, [useLoyaltyPoints, pointsToRedeem, cartItems]);

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (parseFloat(item.final_price) * item.quantity);
    }, 0);
  };

  const availablePoints = loyaltyInfo?.loyalty_points || user?.loyalty_points || 0;
  const subtotal = getSubtotal();
  const finalTotal = Math.max(0, subtotal - loyaltyDiscount);

  const handleCheckout = async () => {
    if (!shippingAddress.trim() || !shippingPhone.trim()) {
      toast.error('Please provide shipping address and phone number');
      return;
    }

    setProcessing(true);

    try {
      // Create order
      const orderData = {
        items: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.final_price
        })),
        total_amount: finalTotal,
        discount_amount: loyaltyDiscount,
        loyalty_points_used: useLoyaltyPoints ? pointsToRedeem : 0,
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
        shipping_phone: shippingPhone
      };

      // For now, we'll just create the order
      // Payment processing can be added later (SSLCommerz, bKash, etc.)
      toast.success('Order placed successfully! Payment will be processed.');
      
      // Clear cart
      await api.delete('/api/cart');
      navigate('/dashboard');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.message || 'Failed to process order');
    } finally {
      setProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage-50 to-peach-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Please login to checkout</h2>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage-50 to-peach-50">
        <Loader />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage-50 to-peach-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <Link to="/shop" className="btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-peach-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/shop-cart')}
            className="text-primary-600 hover:text-primary-700 mb-4"
          >
            ← Back to Cart
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="mt-2 text-gray-600">Review your order and complete the payment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items & Shipping */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Details</h2>
              
              {cartItems.map((item) => (
                <div key={item.id} className="border-b border-gray-200 pb-4 mb-4 last:border-0 last:mb-0">
                  <div className="flex items-start space-x-4">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name_en || item.name_bn}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-2xl">🛠️</span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name_en || item.name_bn}</h3>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      <p className="text-sm text-gray-600">Price: ৳{parseFloat(item.final_price).toFixed(2)} each</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary-600">
                        ৳{(parseFloat(item.final_price) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Shipping Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Shipping Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shipping Address *
                  </label>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Enter your full shipping address"
                    className="input-field"
                    rows="3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="input-field"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-400">
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-primary-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Cash on Delivery</div>
                    <div className="text-sm text-gray-600">Pay when you receive the order</div>
                  </div>
                </label>
                <label className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-400">
                  <input
                    type="radio"
                    name="payment_method"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-primary-500"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Online Payment</div>
                    <div className="text-sm text-gray-600">Pay now using SSLCommerz / bKash / Nagad</div>
                  </div>
                </label>
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
                            setPointsToRedeem(Math.min(availablePoints, Math.floor((subtotal * 0.20) / 50) * 10));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Use Loyalty Points
                      </span>
                    </label>
                    <span className="text-sm text-gray-600">
                      ⭐ {availablePoints} points
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
                  <span>Subtotal ({cartItems.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                  <span>৳{subtotal.toFixed(2)}</span>
                </div>
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Loyalty Discount</span>
                    <span>-৳{loyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
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
                disabled={processing || !shippingAddress.trim() || !shippingPhone.trim()}
                className="w-full btn-primary text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <span className="flex items-center justify-center">
                    <Loader />
                    <span className="ml-2">Processing...</span>
                  </span>
                ) : (
                  'Place Order'
                )}
              </button>
              
              <Link
                to="/shop-cart"
                className="block w-full btn-secondary mt-3 text-center"
              >
                Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopCheckout;

