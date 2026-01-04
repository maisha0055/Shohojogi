import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Cart = () => {
  const { t } = useLanguage();
  const { cartItems, removeFromCart, getCartTotal, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('cart.pleaseLoginToViewCart')}</h2>
          <button onClick={() => navigate('/login')} className="btn-primary">
            {t('common.login')}
          </button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('cart.yourCartIsEmpty')}</h2>
            <p className="text-gray-600 mb-6">{t('cart.addWorkersToCart')}</p>
            <button onClick={() => navigate('/workers')} className="btn-primary">
              {t('common.findWorkers')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const total = getCartTotal();

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('cart.shoppingCart')}</h1>
          <p className="mt-2 text-gray-600">{t('cart.itemsInCart', { count: cartItems.length }).replace('{{count}}', cartItems.length)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start space-x-4">
                  {item.worker_photo ? (
                    <img
                      src={item.worker_photo}
                      alt={item.worker_name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary-600">
                        {item.worker_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{item.worker_name}</h3>
                    <p className="text-sm text-gray-600">{item.worker_category}</p>
                    
                    <div className="mt-3 space-y-2 text-sm">
                      <div>
                        <span className="font-medium">{t('booking.serviceDescription')}:</span> {item.service_description}
                      </div>
                      <div>
                        <span className="font-medium">{t('worker.location')}:</span> {item.service_location}
                      </div>
                      {item.scheduled_date && item.scheduled_time && (
                        <div>
                          <span className="font-medium">{t('cart.schedule')}:</span> {item.scheduled_date} {t('worker.at')} {item.scheduled_time}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">{t('payment.paymentMethod')}:</span> {
                          item.payment_method === 'cash' ? `💰 ${t('payment.cashOnDelivery')}` :
                          item.payment_method === 'online' ? `💳 ${t('payment.onlinePaymentAfterWork')}` :
                          item.payment_method
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary-600 mb-2">
                      ৳{parseFloat(item.estimated_price || 0).toFixed(2)}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      {t('cart.remove')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={clearCart}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                {t('cart.clearCart')}
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('cart.orderSummary')}</h2>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.subtotal')} ({cartItems.length} {t('cart.items')})</span>
                  <span>৳{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t('cart.serviceFee')}</span>
                  <span>৳0.00</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>{t('cart.total')}</span>
                    <span>৳{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Info */}
              {cartItems.length > 0 && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('payment.paymentMethod')}</h3>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {cartItems.every(item => item.payment_method === 'cash') ? (
                      <div>
                        <div className="font-semibold text-gray-900">💰 {t('payment.cashOnDelivery')}</div>
                        <div className="text-xs text-gray-600 mt-1">{t('payment.payWhenServiceCompleted')}</div>
                      </div>
                    ) : cartItems.every(item => item.payment_method === 'online') ? (
                      <div>
                        <div className="font-semibold text-gray-900">💳 {t('payment.onlinePayment')}</div>
                        <div className="text-xs text-gray-600 mt-1">{t('payment.selectGatewayAfterWork')}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-gray-900">{t('payment.mixedPaymentMethods')}</div>
                        <div className="text-xs text-gray-600 mt-1">{t('payment.differentPaymentMethods')}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate('/checkout')}
                className="w-full btn-primary text-lg py-3"
              >
                {t('cart.proceedToCheckout')}
              </button>
              
              <button
                onClick={() => navigate('/workers')}
                className="w-full btn-secondary mt-3"
              >
                {t('cart.continueShopping')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;

