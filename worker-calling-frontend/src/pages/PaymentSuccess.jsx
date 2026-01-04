import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import bookingService from '../services/bookingService';
import api from '../services/api';
import Loader from '../components/common/Loader';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('processing'); // processing, success, error
  const paymentID = searchParams.get('paymentID');
  const gateway = searchParams.get('gateway'); // 'ssl' for SSLCommerz
  const sslStatus = searchParams.get('status'); // success | failed | cancelled
  const valId = searchParams.get('val_id');
  const tranId = searchParams.get('tran_id');
  
  // Debug: Log the paymentID from URL
  useEffect(() => {
    console.log('🔍 PaymentSuccess mounted:', {
      paymentID,
      gateway,
      sslStatus,
      valId,
      tranId,
      paymentIDType: typeof paymentID,
      url: window.location.href,
      searchParams: window.location.search
    });
  }, []);
  const hasProcessedRef = useRef(false); // Prevent duplicate processing

  useEffect(() => {
    // Prevent duplicate execution (React StrictMode runs effects twice in dev)
    if (hasProcessedRef.current) {
      console.log('Payment already processed, skipping...');
      return;
    }

    // If SSLCommerz explicitly reports failed/cancelled, stop early
    if (gateway === 'ssl' && (sslStatus === 'failed' || sslStatus === 'cancelled')) {
      setStatus('error');
      setLoading(false);
      toast.error(`Payment ${sslStatus}. Please try again.`);
      return;
    }

    // For bKash we require paymentID; for SSL we require val_id
    if (gateway === 'ssl') {
      if (!valId) {
        console.error('No val_id in URL for SSLCommerz:', window.location.search);
        setStatus('error');
        setLoading(false);
        toast.error('Payment validation ID not found. Please check your payment status.');
        return;
      }
    } else {
      if (!paymentID) {
        console.error('No paymentID in URL:', window.location.search);
        setStatus('error');
        setLoading(false);
        toast.error('Payment ID not found in URL. Please check your payment status.');
        return;
      }
    }

    // Check if already processed for this payment ID
    const processedKey =
      gateway === 'ssl'
        ? `ssl_payment_processed_${tranId || valId}`
        : `payment_processed_${paymentID}`;
    if (sessionStorage.getItem(processedKey)) {
      console.log('Payment already processed for this paymentID');
      setStatus('success');
      setLoading(false);
      return;
    }

    const processPayment = async () => {
      try {
        // Mark as processing to prevent duplicates
        hasProcessedRef.current = true;

        // Get booking ID from localStorage (for booking payment)
        const bookingId = localStorage.getItem('pendingPaymentBookingId');
        const expectedAmount = localStorage.getItem('pendingPaymentAmount');
        
        console.log('Payment Success Debug:', {
          paymentID,
          paymentIDType: typeof paymentID,
          bookingId,
          bookingIdType: typeof bookingId,
          expectedAmount,
          localStorageKeys: Object.keys(localStorage),
          allLocalStorage: Object.keys(localStorage).map(key => ({ key, value: localStorage.getItem(key) }))
        });
        
        if (bookingId) {
          console.log('Processing booking payment for booking:', bookingId);

          // Get stored points_to_redeem preference for this booking
          const storedPoints = localStorage.getItem(`loyalty_points_${bookingId}`);
          const pointsToRedeem = storedPoints ? parseInt(storedPoints, 10) : 0;

          console.log('💳 Payment Success - Points to redeem:', pointsToRedeem, 'for booking:', bookingId);

          try {
            if (gateway === 'ssl') {
              const validateResponse = await api.post('/api/payments/sslcommerz/validate', {
                val_id: valId,
                booking_id: bookingId,
                points_to_redeem: pointsToRedeem || 0  // Always send a number, not undefined
              });

              if (validateResponse.data.success) {
                sessionStorage.setItem(processedKey, 'true');
                localStorage.removeItem('pendingPaymentBookingId');
                localStorage.removeItem('pendingPaymentAmount');
                localStorage.removeItem('pendingPaymentGateway');
                // Remove stored points preference after successful redemption
                if (pointsToRedeem > 0) {
                  localStorage.removeItem(`loyalty_points_${bookingId}`);
                }

                // Refresh user data to update loyalty points in navbar
                try {
                  const userResponse = await authService.getCurrentUser();
                  if (userResponse.success) {
                    updateUser(userResponse.data);
                    console.log('✅ User data refreshed - loyalty points updated');
                  }
                } catch (error) {
                  console.error('Error refreshing user data:', error);
                }

                setStatus('success');
                toast.success('Payment successful! Your booking has been marked as paid. The worker has been notified.');

                setTimeout(() => {
                  window.location.href = '/bookings';
                }, 1500);
                return;
              }

              setStatus('error');
              toast.error(validateResponse.data?.message || 'Payment validation failed');
              return;
            }

            // Default: bKash execute
            const executeResponse = await api.post('/api/payments/bkash/execute', {
              paymentID: paymentID.trim(),
              booking_id: bookingId,
              points_to_redeem: pointsToRedeem || 0  // Always send a number, not undefined
            });

            console.log('Payment execute response:', executeResponse.data);

            if (executeResponse.data.success) {
              sessionStorage.setItem(processedKey, 'true');
              localStorage.removeItem('pendingPaymentBookingId');
              localStorage.removeItem('pendingPaymentAmount');
              localStorage.removeItem('pendingPaymentGateway');
              // Remove stored points preference after successful redemption
              if (pointsToRedeem > 0) {
                localStorage.removeItem(`loyalty_points_${bookingId}`);
              }

              // Refresh user data to update loyalty points in navbar
              try {
                const userResponse = await authService.getCurrentUser();
                if (userResponse.success) {
                  updateUser(userResponse.data);
                  console.log('✅ User data refreshed - loyalty points updated');
                }
              } catch (error) {
                console.error('Error refreshing user data:', error);
              }

              setStatus('success');
              toast.success('Payment successful! Your booking has been marked as paid. The worker has been notified.');

              setTimeout(() => {
                window.location.href = '/bookings';
              }, 1500);
              return;
            }

            console.error('Payment execution failed:', executeResponse.data);
            setStatus('error');
            toast.error(executeResponse.data?.message || 'Payment execution failed');
          } catch (error) {
            console.error('❌ Error executing payment:', {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status,
              paymentID,
              valId,
              tranId,
              bookingId,
              fullError: error
            });
            
            setStatus('error');
            
            // Get detailed error message
            let errorMessage = 'Failed to process payment';
            
            if (error.response?.data) {
              errorMessage = error.response.data.message || 
                           error.response.data.error || 
                           error.response.data.errorMessage ||
                           errorMessage;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            // Show detailed error in toast
            toast.error(errorMessage, { autoClose: 5000 });
            
            // Also log to console for debugging
            console.error('Payment execution failed:', {
              errorMessage,
              paymentID,
              valId,
              tranId,
              bookingId,
              errorDetails: error.response?.data
            });
          }
        } else {
          // No booking ID found in localStorage
          console.error('No booking ID found in localStorage. Available keys:', Object.keys(localStorage));
          setStatus('error');
          toast.error('Booking information not found. If payment was successful, please check your bookings page or contact support.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error processing payment:', error);
        setStatus('error');
        toast.error('An error occurred while processing your payment.');
      } finally {
        setLoading(false);
      }
    };

    processPayment();
  }, [paymentID, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader />
          <p className="mt-4 text-gray-600">Processing your payment and creating bookings...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-4">
            Your payment has been processed and bookings have been created successfully.
          </p>
          {paymentID && (
            <p className="text-sm text-gray-500 mb-6">
              Payment ID: <span className="font-mono">{paymentID}</span>
            </p>
          )}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/bookings')}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition"
            >
              View My Bookings
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h2>
        <p className="text-gray-600 mb-6">
          There was an error processing your payment. Please contact support if the issue persists.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/bookings')}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition"
          >
            View My Bookings
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
