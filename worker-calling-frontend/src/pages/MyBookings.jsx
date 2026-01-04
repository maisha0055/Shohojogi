import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import authService from '../services/authService';
import bookingService from '../services/bookingService';
import api from '../services/api';
import Loader from '../components/common/Loader';
import ReviewModal from '../components/review/ReviewModal';
import Modal from '../components/common/Modal';
import { toast } from 'react-toastify';
import useSocket from '../hooks/useSocket';

const MyBookings = () => {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { addEstimateToCart } = useCart();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentGatewayModal, setShowPaymentGatewayModal] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [selectedGateway, setSelectedGateway] = useState('bkash'); // bkash | ssl
  const [bookingEstimates, setBookingEstimates] = useState({}); // { bookingId: [estimates] }
  const [loadingEstimates, setLoadingEstimates] = useState({}); // { bookingId: true/false }
  const { socket, connected, on, off } = useSocket();

  // Use ref to store updateUser to avoid dependency issues
  const updateUserRef = useRef(updateUser);
  useEffect(() => {
    updateUserRef.current = updateUser;
  }, [updateUser]);

  // Memoize fetchBookings to prevent unnecessary re-renders
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const statusFilter = filter === 'all' ? null : filter;
      
      let response;
      if (user?.role === 'worker') {
        response = await bookingService.getWorkerBookings(statusFilter);
      } else {
        response = await bookingService.getUserBookings(statusFilter);
      }

      if (response.success) {
        setBookings(response.data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error(t('bookings.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [filter, user?.role, t]);

  // Refresh user data function (memoized)
  const refreshUserData = useCallback(async () => {
    try {
      const userResponse = await authService.getCurrentUser();
      if (userResponse.success) {
        updateUserRef.current(userResponse.data);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }, []);

  // Fetch bookings when filter changes
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Refresh user data only on mount
  useEffect(() => {
    refreshUserData();
  }, []); // Empty dependency array - only run on mount

  // Refresh bookings and user data when component is focused (e.g., after payment redirect)
  useEffect(() => {
    let isMounted = true;
    const handleFocus = async () => {
      if (!isMounted) return;
      await fetchBookings();
      await refreshUserData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchBookings, refreshUserData]);

  // Listen for new estimates via socket (for users only)
  useEffect(() => {
    if (socket && connected && user?.role === 'user') {
      const handleNewEstimate = (data) => {
        console.log('[MyBookings] New estimate received:', data);
        // Add estimate to the booking's estimates list
        setBookingEstimates(prev => {
          const existing = prev[data.booking_id] || [];
          // Check if estimate already exists
          const exists = existing.find(e => e.worker_id === data.worker_id);
          if (exists) return prev;
          
          return {
            ...prev,
            [data.booking_id]: [...existing, {
              worker_id: data.worker_id,
              worker_name: data.worker_name,
              worker_photo: data.worker_photo,
              worker_rating: data.worker_rating,
              worker_reviews: data.worker_reviews,
              estimated_price: data.estimated_price,
              note: data.note,
              created_at: data.created_at
            }]
          };
        });
        toast.info(t('bookings.newEstimateFrom', { workerName: data.worker_name, price: data.estimated_price }).replace('{{workerName}}', data.worker_name).replace('{{price}}', data.estimated_price));
      };

      const handleWorkerSelected = (data) => {
        // Refresh bookings when a worker is selected
        fetchBookings();
        toast.success(t('bookings.workerSelectedSuccessfully'));
      };

      on('booking:new-estimate', handleNewEstimate);
      on('booking:worker-selected', handleWorkerSelected);

      return () => {
        off('booking:new-estimate', handleNewEstimate);
        off('booking:worker-selected', handleWorkerSelected);
      };
    }
  }, [socket, connected, user?.role, on, off, fetchBookings]);

  // Fetch estimates for pending_estimation bookings
  useEffect(() => {
    if (user?.role === 'user' && bookings.length > 0) {
      bookings.forEach(booking => {
        if (booking.booking_type === 'call_worker' && booking.status === 'pending_estimation') {
          // Only fetch if we don't already have estimates for this booking
          if (!bookingEstimates[booking.id]) {
            fetchEstimatesForBooking(booking.id);
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, user?.role]);

  const fetchEstimatesForBooking = async (bookingId) => {
    if (loadingEstimates[bookingId]) return; // Already loading
    
    try {
      setLoadingEstimates(prev => ({ ...prev, [bookingId]: true }));
      const response = await bookingService.getBookingEstimates(bookingId);
      if (response.success) {
        setBookingEstimates(prev => ({
          ...prev,
          [bookingId]: response.data.estimates || []
        }));
      }
    } catch (error) {
      console.error(`Error fetching estimates for booking ${bookingId}:`, error);
    } finally {
      setLoadingEstimates(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleSelectWorker = async (bookingId, workerId) => {
    try {
      setActionLoading(true);
      // Get estimate data for cart
      const response = await bookingService.getEstimateCartData(bookingId, workerId);
      
      if (response.success) {
        // Add to cart
        addEstimateToCart(response.data);
        // Remove estimates for this booking from display
        setBookingEstimates(prev => {
          const updated = { ...prev };
          delete updated[bookingId];
          return updated;
        });
        // Navigate to cart
        navigate('/cart');
      }
    } catch (error) {
      console.error('Error adding estimate to cart:', error);
      toast.error(error.response?.data?.message || t('bookings.failedToAddEstimateToCart'));
    } finally {
      setActionLoading(false);
    }
  };

  const initiatePayment = async (booking, gateway) => {
    if (!booking.final_price) {
      toast.error(t('bookings.finalPriceNotSet'));
      return;
    }

    try {
      setActionLoading(true);

      const bookingIdStr = String(booking.id);
      localStorage.setItem('pendingPaymentBookingId', bookingIdStr);
      localStorage.setItem('pendingPaymentAmount', String(booking.final_price));
      localStorage.setItem('pendingPaymentGateway', gateway);

      // Get stored points_to_redeem preference for this booking
      const storedPoints = localStorage.getItem(`loyalty_points_${booking.id}`);
      const pointsToRedeem = storedPoints ? parseInt(storedPoints, 10) : 0;

      if (gateway === 'bkash') {
        const paymentResponse = await api.post('/api/payments/bkash/create', {
          booking_id: booking.id,
          amount: booking.final_price,
          points_to_redeem: pointsToRedeem > 0 ? pointsToRedeem : undefined
        });
        
        // Store points_to_redeem for use during payment execution
        if (pointsToRedeem > 0) {
          localStorage.setItem(`loyalty_points_${booking.id}`, String(pointsToRedeem));
        }

        if (paymentResponse.data.success && paymentResponse.data.data?.bkashURL) {
          window.location.href = paymentResponse.data.data.bkashURL;
          return;
        }
        toast.error(paymentResponse.data?.message || t('bookings.failedToInitiateBkashPayment'));
        return;
      }

      if (gateway === 'ssl') {
        const paymentResponse = await api.post('/api/payments/sslcommerz/create', {
          booking_id: booking.id,
          amount: booking.final_price,
          points_to_redeem: pointsToRedeem > 0 ? pointsToRedeem : undefined
        });
        
        // Store points_to_redeem for use during payment validation
        if (pointsToRedeem > 0) {
          localStorage.setItem(`loyalty_points_${booking.id}`, String(pointsToRedeem));
        }

        const url = paymentResponse.data?.data?.GatewayPageURL;
        if (paymentResponse.data.success && url) {
          window.location.href = url;
          return;
        }
        toast.error(paymentResponse.data?.message || t('bookings.failedToInitiateSSLPayment'));
        return;
      }

      toast.error(t('bookings.unknownPaymentGateway'));
    } catch (error) {
      console.error('Payment creation error:', error);
      toast.error(error.response?.data?.message || t('bookings.failedToCreatePayment'));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayNow = (booking) => {
    if (!booking.final_price) {
      toast.error(t('bookings.finalPriceNotSet'));
      return;
    }
    setPaymentBooking(booking);
    setSelectedGateway('bkash');
    setShowPaymentGatewayModal(true);
  };

  const handleAcceptBooking = async (bookingId) => {
    try {
      setActionLoading(true);
      await bookingService.acceptBooking(bookingId);
      toast.success(t('bookings.bookingAccepted'));
      
      // Use startTransition to batch state updates and prevent concurrent rendering error
      startTransition(() => {
        setShowModal(false);
        fetchBookings();
      });
    } catch (error) {
      toast.error(t('bookings.failedToAccept'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBooking = async (bookingId) => {
    const reason = prompt(t('bookings.provideRejectionReason'));
    if (!reason) return;

    try {
      setActionLoading(true);
      await bookingService.rejectBooking(bookingId, reason);
      toast.success(t('bookings.bookingRejected'));
      
      // Use startTransition to batch state updates and prevent concurrent rendering error
      startTransition(() => {
        setShowModal(false);
        fetchBookings();
      });
    } catch (error) {
      toast.error(t('bookings.failedToReject'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartJob = async (bookingId) => {
    try {
      setActionLoading(true);
      await bookingService.startJob(bookingId);
      toast.success(t('bookings.jobStarted'));
      
      // Use startTransition to batch state updates and prevent concurrent rendering error
      startTransition(() => {
        setShowModal(false);
        fetchBookings();
      });
    } catch (error) {
      toast.error(t('bookings.failedToStartJob'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJob = async (bookingId) => {
    // For all booking types, price was already fixed/estimated before booking
    // Worker shouldn't enter a new price - backend will use estimated_price as final_price
    try {
      setActionLoading(true);
      // Don't send final_price - backend will use estimated_price for all booking types
      await bookingService.completeJob(bookingId, null);
      toast.success(t('bookings.jobCompleted'));
      
      // Use startTransition to batch state updates and prevent concurrent rendering error
      startTransition(() => {
        setShowModal(false);
        fetchBookings();
      });
    } catch (error) {
      toast.error(error.response?.data?.message || t('bookings.failedToCompleteJob'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    const reason = prompt(t('bookings.provideCancellationReason'));
    if (!reason) return;

    if (window.confirm(t('bookings.confirmCancel'))) {
      try {
        setActionLoading(true);
        await bookingService.cancelBooking(bookingId, reason);
        toast.success(t('booking.bookingCancelled'));
        
        // Use startTransition to batch state updates and prevent concurrent rendering error
        startTransition(() => {
          setShowModal(false);
          fetchBookings();
        });
      } catch (error) {
        toast.error(t('bookings.failedToCancel'));
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleMarkCashPayment = async (bookingId) => {
    if (!window.confirm(t('bookings.confirmMarkCashPayment'))) {
      return;
    }

    try {
      setActionLoading(true);
      const response = await api.post('/api/payments/cash', {
        booking_id: bookingId
      });

      if (response.data.success) {
        toast.success(t('bookings.cashPaymentMarked'));
        
        // Refresh bookings and user data
        startTransition(() => {
          setShowModal(false);
          fetchBookings();
          refreshUserData();
        });
      } else {
        toast.error(response.data.message || t('bookings.failedToMarkCashPayment'));
      }
    } catch (error) {
      console.error('Error marking cash payment:', error);
      toast.error(error.response?.data?.message || t('bookings.failedToMarkCashPayment'));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      accepted: 'bg-blue-100 text-blue-800 border-blue-300',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
      completed: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
      rejected: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getActionButtons = (booking) => {
    const isWorker = user?.role === 'worker';

    if (booking.status === 'pending' && isWorker) {
      return (
        <>
          <button
            onClick={() => handleAcceptBooking(booking.id)}
            className="btn-primary text-sm"
            disabled={actionLoading}
          >
{t('worker.accept')}
          </button>
          <button
            onClick={() => handleRejectBooking(booking.id)}
            className="btn-secondary text-sm"
            disabled={actionLoading}
          >
{t('worker.decline')}
          </button>
        </>
      );
    }

    if (booking.status === 'accepted' && isWorker) {
      return (
        <button
          onClick={() => handleStartJob(booking.id)}
          className="btn-primary text-sm"
          disabled={actionLoading}
        >
{t('bookings.startJob')}
        </button>
      );
    }

    if (booking.status === 'in_progress' && isWorker) {
      return (
        <button
          onClick={() => handleCompleteJob(booking.id)}
          className="btn-primary text-sm"
          disabled={actionLoading}
        >
{t('bookings.completeJob')}
        </button>
      );
    }

    if (booking.status === 'completed' && isWorker && 
        booking.payment_method === 'cash' && 
        booking.payment_status !== 'paid') {
      return (
        <button
          onClick={() => handleMarkCashPayment(booking.id)}
          className="btn-primary text-sm bg-green-600 hover:bg-green-700"
          disabled={actionLoading}
        >
💵 {t('bookings.markCashPayment')}
        </button>
      );
    }

    if (['pending', 'accepted'].includes(booking.status)) {
      return (
        <button
          onClick={() => handleCancelBooking(booking.id)}
          className="text-sm text-red-600 hover:text-red-700"
          disabled={actionLoading}
        >
{t('bookings.cancelBooking')}
        </button>
      );
    }

    if (booking.status === 'completed' && !isWorker) {
      // Check if payment is needed for online payment
      const needsPayment = booking.payment_method === 'online' && 
                          booking.payment_status !== 'paid' && 
                          booking.final_price;
      
      // Check if review already exists
      const hasReview = booking.review_id || false;
      
        return (
        <div className="flex gap-2">
          {needsPayment && (
            <button
              onClick={() => handlePayNow(booking)}
              disabled={actionLoading}
              className="btn-primary text-sm bg-green-600 hover:bg-green-700"
            >
💳 {t('bookings.payNow')} (৳{parseFloat(booking.final_price || 0).toFixed(2)})
            </button>
          )}
          {booking.payment_status === 'paid' && (
            <span className="text-sm text-green-600 font-medium px-2">
✓ {t('bookings.paid')}
            </span>
          )}
          {hasReview ? (
          <span className="text-sm text-green-600 font-medium">
✓ {t('bookings.reviewed')}
          </span>
          ) : (
        <button
          onClick={() => {
            setReviewBooking(booking);
            setShowReviewModal(true);
          }}
          className="btn-primary text-sm"
              disabled={needsPayment} // Can't review until paid
        >
{t('bookings.leaveReview')}
        </button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
{user?.role === 'worker' ? t('bookings.myJobs') : t('bookings.myBookings')}
          </h1>
          <p className="mt-2 text-gray-600">
{user?.role === 'worker'
              ? t('bookings.manageJobs')
              : t('bookings.trackBookings')}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {status === 'all' ? t('booking.all') : status === 'in_progress' ? t('booking.inProgress') : t(`booking.${status}`)}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : bookings.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('bookings.noBookingsFound')}
            </h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? t('bookings.noBookingsYet')
                : t('bookings.noFilteredBookings').replace('{{filter}}', t(`booking.${filter}`))}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(Array.isArray(bookings) ? bookings : []).map((booking) => (
              <div key={booking.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {user?.role === 'worker'
                              ? booking.user?.full_name
                              : booking.worker?.full_name}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(booking.status)}`}>
    {(() => {
      const statusKey = `booking.${booking.status}`;
      const translated = t(statusKey);
      return translated === statusKey 
        ? booking.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        : translated;
    })()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          #{booking.booking_number}
                        </p>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-2">{booking.service_description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <span className="mr-1">📍</span>
                        {booking.service_location}
                      </div>
                      {booking.booking_type === 'scheduled' && booking.scheduled_date && (
                        <div className="flex items-center">
                          <span className="mr-1">📅</span>
                          {new Date(booking.scheduled_date).toLocaleDateString()} at {booking.scheduled_time}
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="mr-1">💰</span>
                        {booking.final_price ? `৳${booking.final_price}` : `Est. ৳${booking.estimated_price}`}
                      </div>
                      <div className="flex items-center">
                        <span className="mr-1">💳</span>
{booking.payment_method === 'cash' ? t('payment.cash') : t('payment.online')}
                      </div>
                      {booking.status === 'completed' && booking.payment_status && (
                        <div className="flex items-center">
                          <span className="mr-1">
                            {booking.payment_status === 'paid' ? '✅' : '⏳'}
                          </span>
                          <span className={booking.payment_status === 'paid' ? 'text-green-600 font-semibold' : 'text-orange-600'}>
{booking.payment_status === 'paid' ? t('bookings.paid') : t('bookings.pendingPayment')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
{t('bookings.created')}: {new Date(booking.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Worker Estimates Section (for instant call requests) */}
                  {user?.role === 'user' && booking.booking_type === 'call_worker' && booking.status === 'pending_estimation' && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {t('bookings.workerEstimates')}
                          {bookingEstimates[booking.id] && (
                            <span className="ml-2 text-sm font-normal text-gray-600">
                              ({bookingEstimates[booking.id]?.length || 0})
                            </span>
                          )}
                        </h4>
                        <button
                          onClick={() => fetchEstimatesForBooking(booking.id)}
                          disabled={loadingEstimates[booking.id]}
                          className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
                        >
                          {loadingEstimates[booking.id] ? t('common.loading') : `🔄 ${t('common.refresh')}`}
                        </button>
                      </div>

                      {loadingEstimates[booking.id] ? (
                        <div className="text-center py-4">
                          <Loader />
                        </div>
                      ) : bookingEstimates[booking.id] && bookingEstimates[booking.id].length > 0 ? (
                        <div className="space-y-3">
                          {bookingEstimates[booking.id].map((estimate, index) => (
                            <div key={estimate.id || index} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-primary-400 transition-all">
                              <div className="flex items-start gap-4">
                                {/* Worker Photo */}
                                <div className="flex-shrink-0">
                                  {estimate.worker_photo ? (
                                    <img
                                      src={estimate.worker_photo}
                                      alt={estimate.worker_name}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-primary-200"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg font-bold border-2 border-primary-200">
                                      {estimate.worker_name?.charAt(0).toUpperCase() || 'W'}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Worker Info */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="font-semibold text-gray-900">{estimate.worker_name}</h5>
                                    {estimate.average_rating && (
                                      <span className="text-xs text-gray-600 flex items-center gap-1">
                                        ⭐ {parseFloat(estimate.average_rating).toFixed(1)}
                                        {estimate.worker_reviews && (
                                          <span className="text-gray-500">({estimate.worker_reviews})</span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Price */}
                                  <div className="text-2xl font-bold text-primary-600 mb-2">
                                    ৳{parseFloat(estimate.estimated_price).toLocaleString()}
                                  </div>
                                  
                                  {/* Note */}
                                  {estimate.note && (
                                    <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-2">
                                      <p className="text-sm text-gray-700 italic">"{estimate.note}"</p>
                                    </div>
                                  )}
                                  
                                  {/* Submitted Time */}
                                  <p className="text-xs text-gray-400">
                                    {t('bookings.submitted')} {new Date(estimate.created_at).toLocaleString()}
                                  </p>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex-shrink-0 flex flex-col gap-2">
                                  <button
                                    onClick={() => handleSelectWorker(booking.id, estimate.worker_id)}
                                    disabled={actionLoading}
                                    className="btn-primary px-4 py-2 whitespace-nowrap text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    ✓ {t('bookings.select')}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                          <div className="text-3xl mb-2 animate-pulse">⏳</div>
                          <p className="text-sm text-gray-600">
                            {t('bookings.waitingForEstimates')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 md:mt-0 md:ml-6 flex flex-wrap gap-2">
                    {getActionButtons(booking)}
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowModal(true);
                      }}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
{t('admin.viewDetails')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">{t('bookings.bookingDetails')}</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">{t('bookings.bookingNumber')}</label>
                    <p className="text-gray-900">#{selectedBooking.booking_number}</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">
{user?.role === 'worker' ? t('bookings.customer') : t('worker.workers')}
                    </label>
                    <p className="text-gray-900">
                      {user?.role === 'worker'
                        ? selectedBooking.user?.full_name
                        : selectedBooking.worker?.full_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {user?.role === 'worker'
                        ? selectedBooking.user?.phone
                        : selectedBooking.worker?.phone}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">{t('booking.serviceDescription')}</label>
                    <p className="text-gray-900">{selectedBooking.service_description}</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">{t('worker.location')}</label>
                    <p className="text-gray-900">{selectedBooking.service_location}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">{t('booking.bookingType')}</label>
                      <p className="text-gray-900 capitalize">{t(`booking.${selectedBooking.booking_type}Booking`)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">{t('admin.status')}</label>
                      <p className="text-gray-900 capitalize">
                        {t(`booking.${selectedBooking.status}`) === `booking.${selectedBooking.status}` 
                          ? selectedBooking.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : t(`booking.${selectedBooking.status}`)}
                      </p>
                    </div>
                  </div>

                  {selectedBooking.scheduled_date && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700">{t('bookings.scheduledFor')}</label>
                      <p className="text-gray-900">
                        {new Date(selectedBooking.scheduled_date).toLocaleDateString()} at {selectedBooking.scheduled_time}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">{t('booking.estimatedPrice')}</label>
                      <p className="text-gray-900">৳{selectedBooking.estimated_price}</p>
                    </div>
                    {selectedBooking.final_price && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">{t('bookings.finalPrice')}</label>
                        <p className="text-gray-900">৳{selectedBooking.final_price}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">{t('payment.paymentMethod')}</label>
                    <p className="text-gray-900 capitalize">{selectedBooking.payment_method}</p>
                    </div>
                    {selectedBooking.payment_status && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">{t('bookings.paymentStatus')}</label>
                        <p className={`text-gray-900 capitalize ${
                          selectedBooking.payment_status === 'paid' ? 'text-green-600 font-semibold' : ''
                        }`}>
                          {selectedBooking.payment_status}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  {getActionButtons(selectedBooking)}
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
{t('common.close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Gateway Modal */}
        <Modal
          isOpen={showPaymentGatewayModal}
          onClose={() => {
            setShowPaymentGatewayModal(false);
            setPaymentBooking(null);
          }}
          title={t('bookings.choosePaymentGateway')}
          size="sm"
        >
          <div className="space-y-4">
            <div className="text-sm text-gray-700">
              <div className="font-semibold">{t('bookings.booking')}:</div>
              <div className="text-gray-600">#{paymentBooking?.booking_number}</div>
              <div className="mt-2 font-semibold">{t('payment.total')}:</div>
              <div className="text-gray-600">৳{paymentBooking?.final_price}</div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="gateway"
                  value="bkash"
                  checked={selectedGateway === 'bkash'}
                  onChange={() => setSelectedGateway('bkash')}
                />
                <div>
                  <div className="font-semibold text-gray-900">bKash</div>
                  <div className="text-xs text-gray-500">{t('bookings.payWithBkash')}</div>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="gateway"
                  value="ssl"
                  checked={selectedGateway === 'ssl'}
                  onChange={() => setSelectedGateway('ssl')}
                />
                <div>
                  <div className="font-semibold text-gray-900">SSLCommerz</div>
                  <div className="text-xs text-gray-500">{t('bookings.payWithSSL')}</div>
                </div>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 btn-secondary"
                onClick={() => {
                  setShowPaymentGatewayModal(false);
                  setPaymentBooking(null);
                }}
                disabled={actionLoading}
              >
{t('common.cancel')}
              </button>
              <button
                className="flex-1 btn-primary"
                onClick={() => {
                  if (!paymentBooking) return;
                  setShowPaymentGatewayModal(false);
                  initiatePayment(paymentBooking, selectedGateway);
                }}
                disabled={actionLoading || !paymentBooking}
              >
{actionLoading ? t('bookings.starting') : t('bookings.payNow')}
              </button>
            </div>
          </div>
        </Modal>

        {/* Review Modal */}
        {showReviewModal && reviewBooking && (
          <ReviewModal
            isOpen={showReviewModal}
            onClose={() => {
              setShowReviewModal(false);
              setReviewBooking(null);
            }}
            booking={reviewBooking}
            onReviewSubmitted={() => {
              fetchBookings();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MyBookings;