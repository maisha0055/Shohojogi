import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useLanguage } from './LanguageContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { t } = useLanguage();
  const [cartItems, setCartItems] = useState([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (worker, bookingData) => {
    const cartItem = {
      id: `${worker.id}-${Date.now()}`,
      worker_id: worker.id,
      worker_name: worker.full_name,
      worker_photo: worker.profile_photo,
      worker_category: worker.service_category_name,
      service_category_id: worker.service_category_id, // Add this for checkout
      worker_hourly_rate: worker.hourly_rate,
      service_description: bookingData.service_description,
      service_location: bookingData.service_location,
      location_latitude: bookingData.location_latitude,
      location_longitude: bookingData.location_longitude,
      scheduled_date: bookingData.scheduled_date,
      scheduled_time: bookingData.scheduled_time,
      payment_method: bookingData.payment_method || 'cash',
      estimated_price: bookingData.estimated_price || worker.hourly_rate,
      booking_type: bookingData.booking_type || 'instant', // Add booking_type
      added_at: new Date().toISOString()
    };

    setCartItems(prev => [...prev, cartItem]);
    toast.success(t('cart.addedToCart'));
  };

  // Add instant call estimate to cart
  const addEstimateToCart = (cartData) => {
    const cartItem = {
      id: `call_worker_${cartData.booking_id}_${Date.now()}`,
      booking_id: cartData.booking_id, // Store booking_id for call_worker bookings
      booking_number: cartData.booking_number,
      worker_id: cartData.worker_id,
      worker_name: cartData.worker_name,
      worker_photo: cartData.worker_photo,
      worker_category: cartData.service_category_id, // Will be resolved in checkout
      service_category_id: cartData.service_category_id,
      service_description: cartData.service_description,
      service_location: cartData.service_location,
      location_latitude: cartData.location_latitude,
      location_longitude: cartData.location_longitude,
      payment_method: cartData.payment_method || 'cash',
      estimated_price: cartData.estimated_price,
      booking_type: 'call_worker', // Mark as call_worker type
      added_at: new Date().toISOString()
    };

    setCartItems(prev => [...prev, cartItem]);
    toast.success(t('cart.estimateAddedToCart'));
  };

  const removeFromCart = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    toast.info(t('cart.removedFromCart'));
  };

  const clearCart = () => {
    setCartItems([]);
    toast.info(t('cart.cartCleared'));
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (parseFloat(item.estimated_price) || 0), 0);
  };

  const getCartCount = () => {
    return cartItems.length;
  };

  const updateCartItemPaymentMethod = (itemId, paymentMethod) => {
    setCartItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, payment_method: paymentMethod } : item
    ));
  };

  const updateAllCartItemsPaymentMethod = (paymentMethod) => {
    setCartItems(prev => prev.map(item => ({ ...item, payment_method: paymentMethod })));
  };

  const value = {
    cartItems,
    addToCart,
    addEstimateToCart,
    removeFromCart,
    clearCart,
    getCartTotal,
    getCartCount,
    updateCartItemPaymentMethod,
    updateAllCartItemsPaymentMethod
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export default CartContext;

