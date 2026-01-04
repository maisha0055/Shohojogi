// WorkerDetails.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import workerService from '../services/workerService';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import { toast } from 'react-toastify';
import { reverseGeocodeOSM } from '../utils/osmGeocoding';

const WorkerDetails = () => {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsAddress, setGpsAddress] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null); // meters (smaller = better)
  const [gpsError, setGpsError] = useState('');
  const [bookingData, setBookingData] = useState({
    service_description: '',
    service_location: '',
    location_latitude: null,
    location_longitude: null,
    scheduled_date: '',
    scheduled_time: '',
    payment_method: 'cash',
    slot_id: null,
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const fetchWorkerDetails = useCallback(async () => {
    try {
      const response = await workerService.getWorkerById(id);
      
      if (response && response.success) {
        // Normalize numeric fields
        const workerData = {
          ...response.data,
          average_rating: response.data.average_rating ? parseFloat(response.data.average_rating) : 0,
          hourly_rate: response.data.hourly_rate ? parseFloat(response.data.hourly_rate) : 0,
          experience_years: response.data.experience_years ? parseInt(response.data.experience_years) : 0,
          total_reviews: response.data.total_reviews ? parseInt(response.data.total_reviews) : 0,
          total_jobs_completed: response.data.total_jobs_completed ? parseInt(response.data.total_jobs_completed) : 0
        };
        setWorker(workerData);
      } else {
        toast.error(response?.message || t('workerDetails.failedToLoad'));
      }
    } catch (error) {
      console.error('Error fetching worker:', error);
      toast.error(error.response?.data?.message || t('common.serverError'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const checkIfFavorite = useCallback(async () => {
    try {
      const response = await api.get('/api/users/favorites');
      if (response.data.success) {
        const favorites = response.data.data;
        setIsFavorite(favorites.some(fav => fav.id === id));
      }
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchWorkerDetails();
  }, [fetchWorkerDetails]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'user' && id) {
      checkIfFavorite();
    }
  }, [checkIfFavorite, id, isAuthenticated, user?.role]);

  // Fetch available slots when modal opens
  useEffect(() => {
    if (showBookingModal && id) {
      fetchAvailableSlots();
    } else {
      // Reset slots when modal closes
      setAvailableSlots([]);
      setSelectedSlot(null);
    }
  }, [showBookingModal, id]);

  const fetchAvailableSlots = async () => {
    try {
      setLoadingSlots(true);
      const response = await api.get(`/api/workers/${id}/slots`);
      if (response.data.success) {
        setAvailableSlots(response.data.data || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      setAvailableSlots([]);
      // Don't show error toast - slots are optional, worker might not have created any
    } finally {
      setLoadingSlots(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast.info(t('workerDetails.pleaseLoginToAddFavorites'));
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        await api.delete(`/api/users/favorites/${id}`);
        setIsFavorite(false);
        toast.success(t('workerDetails.removedFromFavorites'));
      } else {
        await api.post(`/api/users/favorites/${id}`);
        setIsFavorite(true);
        toast.success(t('workerDetails.addedToFavorites'));
      }
    } catch (error) {
      toast.error(t('workerDetails.failedToUpdateFavorites'));
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      toast.info(t('workerDetails.pleaseLoginToBook'));
      navigate('/login');
      return;
    }

    if (user?.role !== 'user') {
      toast.error(t('workerDetails.onlyUsersCanBook'));
      return;
    }

    setShowBookingModal(true);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setGpsLoading(true);
      setGpsError('');
      setGpsAddress('');
      setGpsAccuracy(null);

      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]';

      // Most browsers require HTTPS for geolocation, but localhost is allowed.
      if (!window.isSecureContext && !isLocalhost) {
        const msg = t('workerDetails.gpsRequiresHttps');
        setGpsError(msg);
        toast.error(msg);
        setGpsLoading(false);
        return;
      }

      const getPos = (options) =>
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });

      // Refine position for a few seconds to improve accuracy on Windows/laptops.
      const watchBestPos = ({ maxWaitMs = 12000, targetAccuracyM = 60 } = {}) =>
        new Promise((resolve, reject) => {
          if (!navigator.geolocation.watchPosition) {
            reject(new Error('watchPosition not supported'));
            return;
          }

          let best = null;
          let watchId = null;

          const finish = (result) => {
            if (watchId != null) navigator.geolocation.clearWatch(watchId);
            resolve(result);
          };

          const fail = (err) => {
            if (watchId != null) navigator.geolocation.clearWatch(watchId);
            reject(err);
          };

          const timer = setTimeout(() => {
            if (best) finish(best);
            else fail({ code: 3, message: 'Location request timed out.' });
          }, maxWaitMs);

          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              const acc = pos?.coords?.accuracy;
              if (!best || (Number.isFinite(acc) && acc < (best.coords?.accuracy ?? Infinity))) {
                best = pos;
              }

              // Update UI continuously so user sees it improving.
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              setGpsAccuracy(Number.isFinite(acc) ? acc : null);
              setBookingData((prev) => ({
                ...prev,
                location_latitude: lat,
                location_longitude: lng,
              }));
              setGpsAddress(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);

              if (Number.isFinite(acc) && acc <= targetAccuracyM) {
                clearTimeout(timer);
                finish(pos);
              }
            },
            (err) => {
              clearTimeout(timer);
              fail(err);
            },
            { enableHighAccuracy: true, timeout: maxWaitMs, maximumAge: 0 }
          );
        });

      const run = async () => {
        try {
          // Attempt 1: refine for a few seconds to get a better fix.
          let position;
          try {
            position = await watchBestPos({ maxWaitMs: 12000, targetAccuracyM: 60 });
          } catch {
            // If watch fails (or user agent blocks it), fall back to getCurrentPosition.
            position = await getPos({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
          }
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const acc = position.coords.accuracy;

          // Set coords immediately so the user sees something even if reverse-geocode is slow/fails.
          setBookingData((prev) => ({
            ...prev,
            location_latitude: lat,
            location_longitude: lng,
          }));
          setGpsAccuracy(Number.isFinite(acc) ? acc : null);

          let addr = null;
          try {
            addr = await reverseGeocodeOSM({ lat, lng });
          } catch (e) {
            console.warn('Reverse geocoding failed:', e);
          }

          setBookingData((prev) => ({
            ...prev,
            location_latitude: lat,
            location_longitude: lng,
            // Only auto-fill the textarea if user hasn't typed anything yet.
            service_location: prev.service_location?.trim()
              ? prev.service_location
              : (addr || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`),
          }));

          if (addr) setGpsAddress(addr);
          else setGpsAddress(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);

          toast.success(t('workerDetails.locationCaptured'));
          setGpsLoading(false);
        } catch (error) {
          // Some devices/browsers fail high accuracy; retry once with lower accuracy + longer timeout.
          const code = error?.code;
          const message = error?.message;
          console.error('Error getting location:', { code, message, error, isSecureContext: window.isSecureContext, origin: window.location.origin });

          if (code === 2 || code === 3) {
            try {
              const position = await getPos({ enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 });
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              const acc = position.coords.accuracy;

              setBookingData((prev) => ({
                ...prev,
                location_latitude: lat,
                location_longitude: lng,
              }));
              setGpsAccuracy(Number.isFinite(acc) ? acc : null);

              let addr = null;
              try {
                addr = await reverseGeocodeOSM({ lat, lng });
              } catch (e) {
                console.warn('Reverse geocoding failed:', e);
              }

              setBookingData((prev) => ({
                ...prev,
                location_latitude: lat,
                location_longitude: lng,
                service_location: prev.service_location?.trim()
                  ? prev.service_location
                  : (addr || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`),
              }));

              if (addr) setGpsAddress(addr);
              else setGpsAddress(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);

              toast.success(t('workerDetails.locationCaptured'));
              setGpsLoading(false);
              return;
            } catch (retryError) {
              const retryCode = retryError?.code;
              const retryMsg = retryError?.message;
              console.error('Retry getting location failed:', { code: retryCode, message: retryMsg, retryError });
              // fall through to final error message
              error = retryError;
            }
          }

          let msg = t('workerDetails.failedToGetLocation');
          if (error?.code === 1) msg = t('workerDetails.locationPermissionDenied');
          else if (error?.code === 2) msg = t('workerDetails.locationUnavailable');
          else if (error?.code === 3) msg = t('workerDetails.locationTimeout');
          else if (error?.message) msg = error.message;

          setGpsError(msg);
          toast.error(msg);
          setGpsLoading(false);
        }
      };

      run();
    } else {
      const msg = t('workerDetails.geolocationNotSupported');
      setGpsError(msg);
      toast.error(msg);
    }
  };

  const handleBookingDataChange = (e) => {
    const { name, value } = e.target;
    setBookingData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddToCart = () => {
    if (!bookingData.service_description || !bookingData.service_location) {
      toast.error(t('workerDetails.fillServiceDescriptionAndLocation'));
      return;
    }

    // Validate slot selection if slots are available
    if (availableSlots.length > 0 && !selectedSlot) {
      toast.error('Please select a slot or choose a different booking method');
      return;
    }

    // Calculate estimated price (using hourly rate as base)
    const estimatedPrice = worker.hourly_rate || 200;

    addToCart(worker, {
      ...bookingData,
      slot_id: selectedSlot?.id || null,
      // If slot is selected, use slot's date and time
      scheduled_date: selectedSlot ? selectedSlot.slot_date : bookingData.scheduled_date,
      scheduled_time: selectedSlot ? selectedSlot.start_time : bookingData.scheduled_time,
      estimated_price: estimatedPrice
    });

    setShowBookingModal(false);
    setBookingData({
      service_description: '',
      service_location: '',
      location_latitude: null,
      location_longitude: null,
      scheduled_date: '',
      scheduled_time: '',
      payment_method: 'cash',
      slot_id: null,
    });
    setSelectedSlot(null);
  };

  const getAvailabilityBadge = (status) => {
    const badges = {
      available: (
        <span className="inline-flex items-center px-4 py-2 rounded-full text-base font-semibold bg-green-100 text-green-800 border-2 border-green-300">
          <span className="w-3 h-3 bg-green-600 rounded-full mr-2 animate-pulse"></span>
          {t('worker.available')}
        </span>
      ),
      busy: (
        <span className="inline-flex items-center px-4 py-2 rounded-full text-base font-semibold bg-yellow-100 text-yellow-800 border-2 border-yellow-300">
          <span className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></span>
          {t('worker.busy')}
        </span>
      ),
      offline: (
        <span className="inline-flex items-center px-4 py-2 rounded-full text-base font-semibold bg-gray-100 text-gray-800 border-2 border-gray-300">
          <span className="w-3 h-3 bg-gray-600 rounded-full mr-2"></span>
          {t('worker.offline')}
        </span>
      ),
    };
    return badges[status] || badges.offline;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('workerDetails.workerNotFound')}
          </h2>
          <button onClick={() => navigate('/workers')} className="btn-primary">
            {t('workerDetails.backToSearch')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/workers')}
          className="mb-6 text-primary-600 hover:text-primary-700 flex items-center font-medium"
        >
          ← Back to Search
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Worker Info Card */}
            <div className="card">
              <div className="flex items-start space-x-6">
                {worker.profile_photo ? (
                  <img
                    src={worker.profile_photo}
                    alt={worker.full_name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-primary-100"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center border-4 border-primary-200">
                    <span className="text-5xl font-bold text-primary-600">
                      {worker.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {worker.full_name}
                      </h1>
                      <p className="text-lg text-gray-600">
                        {worker.service_category_name}
                      </p>
                    </div>
                    <button
                      onClick={handleToggleFavorite}
                      className={`p-3 rounded-full transition-colors ${
                        isFavorite
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-3xl">
                        {isFavorite ? '❤️' : '🤍'}
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Rating */}
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400 text-2xl">★</span>
                      <div>
                        <span className="text-2xl font-bold">
                          {worker.average_rating?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-gray-600 ml-2">
                          ({worker.total_reviews} reviews)
                        </span>
                      </div>
                    </div>

                    {/* Jobs Completed */}
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">✓</span>
                      <div>
                        <span className="text-2xl font-bold">
                          {worker.total_jobs_completed}
                        </span>
                        <span className="text-gray-600 ml-2">{t('worker.jobsCompleted')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Experience & Rate */}
                  <div className="flex flex-wrap gap-6 mb-4">
                    {worker.experience_years > 0 && (
                      <div>
                        <span className="text-sm text-gray-600 block">{t('worker.experience')}</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {worker.experience_years} {t('worker.years')}
                        </span>
                      </div>
                    )}
                    {worker.hourly_rate && (
                      <div>
                        <span className="text-sm text-gray-600 block">{t('worker.hourlyRate')}</span>
                        <span className="text-2xl font-bold text-primary-600">
                          ৳{worker.hourly_rate}/hour
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Verification Badge */}
                  {worker.verification_status === 'verified' && (
                    <div className="mb-4">
                      <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold border border-green-300">
                        ✓ {t('workerDetails.verifiedWorker')}
                      </span>
                    </div>
                  )}

                  {/* AVAILABILITY STATUS - PROMINENTLY DISPLAYED */}
                  <div className="mt-4">
                    {getAvailabilityBadge(worker.availability_status)}
                  </div>
                </div>
              </div>
            </div>

            {/* About */}
            {worker.bio && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('workerDetails.about')}</h2>
                <p className="text-gray-700 leading-relaxed text-lg">{worker.bio}</p>
              </div>
            )}

            {/* Skills */}
            {worker.skills && worker.skills.length > 0 && (
              <div className="card">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('worker.skills')}</h2>
                <div className="flex flex-wrap gap-3">
                  {worker.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-primary-100 text-primary-800 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="card">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('workerDetails.reviews')} ({worker.total_reviews})
              </h2>
              {worker.recent_reviews && worker.recent_reviews.length > 0 ? (
                <div className="space-y-6">
                  {worker.recent_reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {review.user_photo ? (
                            <img
                              src={review.user_photo}
                              alt={review.user_name}
                              className="w-12 h-12 rounded-full"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-600 font-semibold">
                                {review.user_name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 text-lg">
                              {review.user_name}
                            </h4>
                            <div className="flex items-center">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={star}
                                    className={`text-lg ${
                                      star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                                    }`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="ml-2 font-semibold text-lg text-gray-900">
                                {review.rating}/5
                              </span>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-gray-700 text-base leading-relaxed">
                              {review.comment}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">{t('workerDetails.noReviewsYet')}</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card sticky top-20 space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {t('workerDetails.bookThisWorker')}
              </h3>

              {worker.hourly_rate && (
                <div>
                  <div className="text-4xl font-bold text-primary-600">
                    ৳{worker.hourly_rate}
                  </div>
                  <div className="text-gray-600">{t('workerDetails.perHour')}</div>
                </div>
              )}

              {/* LOYALTY POINTS DISPLAY */}
              {isAuthenticated && user?.role === 'user' && user?.loyalty_points > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-yellow-800">
                        {t('user.yourLoyaltyPoints')}
                      </div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {user.loyalty_points} {t('user.points')}
                      </div>
                    </div>
                    <div className="text-3xl">⭐</div>
                  </div>
                  <p className="text-xs text-yellow-700 mt-2">
                    {t('user.usePointsForDiscounts')}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleBookNow}
                  disabled={worker.availability_status !== 'available'}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-lg py-3"
                >
                  {worker.availability_status === 'available'
                    ? `📅 ${t('workerDetails.bookNow')}`
                    : `⏰ ${t('workerDetails.currentlyUnavailable')}`}
                </button>

                {isAuthenticated && user?.role === 'user' && (
                  <button
                    onClick={() => navigate(`/chat?user=${id}`)}
                    className="w-full btn-secondary text-lg py-3"
                  >
                    💬 {t('workerDetails.sendMessage')}
                  </button>
                )}
              </div>

              {/* Contact Info */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 text-lg">
                  {t('workerDetails.contactInformation')}
                </h4>
                <div className="space-y-3">
                  {worker.phone && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-3 text-xl">📱</span>
                      <span className="font-medium">{worker.phone}</span>
                    </div>
                  )}
                  {worker.email && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-3 text-xl">📧</span>
                      <span className="font-medium">{worker.email}</span>
                    </div>
                  )}
                  {worker.address && (
                    <div className="flex items-start text-gray-700">
                      <span className="mr-3 text-xl">📍</span>
                      <span className="font-medium">{worker.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Trust & Safety */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4 text-lg">
                  {t('workerDetails.trustAndSafety')}
                </h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✓</span>
                    {t('workerDetails.identityVerified')}
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✓</span>
                    {t('workerDetails.backgroundChecked')}
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">✓</span>
                    {t('workerDetails.reviewedByCustomers')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setGpsAddress('');
          setGpsError('');
          setGpsAccuracy(null);
          setBookingData({
            service_description: '',
            service_location: '',
            location_latitude: null,
            location_longitude: null,
            scheduled_date: '',
            scheduled_time: '',
            payment_method: 'cash',
            slot_id: null,
          });
          setSelectedSlot(null);
          setAvailableSlots([]);
        }}
        title={t('workerDetails.bookThisWorker')}
        size="lg"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          handleAddToCart();
        }} className="space-y-4">
          {/* Service Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('booking.serviceDescription')} *
            </label>
            <textarea
              name="service_description"
              value={bookingData.service_description}
              onChange={handleBookingDataChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('workerDetails.describeWorkNeeded')}
              required
            />
          </div>

          {/* Service Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('worker.location')} *
            </label>
            <div className="flex gap-2">
              <textarea
                name="service_location"
                value={bookingData.service_location}
                onChange={handleBookingDataChange}
                rows={2}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={t('workerDetails.addressPlaceholder')}
                required
              />
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gpsLoading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {gpsLoading ? t('workerDetails.getting') : 'GPS'}
              </button>
            </div>
            {(bookingData.location_latitude && bookingData.location_longitude) && (
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-semibold">{t('workerDetails.coordinates')}:</span>{' '}
                {bookingData.location_latitude.toFixed(6)}, {bookingData.location_longitude.toFixed(6)}
                {Number.isFinite(gpsAccuracy) && (
                  <span className="ml-2 text-gray-500">
                    (accuracy ~ {Math.round(gpsAccuracy)}m)
                  </span>
                )}
              </div>
            )}
            {gpsAddress && (
              <div className="mt-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                <span className="font-semibold">{t('workerDetails.gpsDetected')}:</span> {gpsAddress}
              </div>
            )}
            {gpsError && (
              <div className="mt-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                {gpsError}
              </div>
            )}
          </div>

          {/* Available Slots */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Available Slots {availableSlots.length > 0 && '(Select a 2-hour slot)'}
            </label>
            {loadingSlots ? (
              <div className="text-center py-4 text-gray-600 text-sm">Loading slots...</div>
            ) : availableSlots.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50">
                  {availableSlots.map((slot) => {
                    const [hours, minutes] = slot.start_time.split(':');
                    const hour = parseInt(hours);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const displayHour = hour % 12 || 12;
                    const endHour = (hour + 2) % 24;
                    const endDisplayHour = endHour % 12 || 12;
                    const endAmpm = endHour >= 12 ? 'PM' : 'AM';
                    
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          setSelectedSlot(slot);
                          setBookingData({
                            ...bookingData,
                            scheduled_date: slot.slot_date,
                            scheduled_time: slot.start_time,
                            slot_id: slot.id
                          });
                        }}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          selectedSlot?.id === slot.id
                            ? 'border-primary-600 bg-primary-50 shadow-md'
                            : 'border-gray-300 hover:border-primary-400 bg-white'
                        }`}
                      >
                        <div className="font-semibold text-gray-900">
                          {new Date(slot.slot_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {displayHour}:{minutes} {ampm} - {endDisplayHour}:{minutes} {endAmpm}
                        </div>
                        {selectedSlot?.id === slot.id && (
                          <div className="text-xs text-primary-600 mt-2 font-semibold">✓ Selected</div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedSlot && (
                  <p className="text-sm text-green-600 mt-2 font-medium">
                    ✓ Selected: {new Date(selectedSlot.slot_date).toLocaleDateString()} at {formatTime(selectedSlot.start_time)}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 border border-gray-200 rounded-lg">
                No available slots. This worker hasn't created any slots yet. You can still book by selecting a date and time below.
              </div>
            )}
          </div>

          {/* Scheduled Date (only show if no slots available) */}
          {availableSlots.length === 0 && !loadingSlots && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('booking.scheduledDate')} *
                </label>
                <input
                  type="date"
                  name="scheduled_date"
                  value={bookingData.scheduled_date}
                  onChange={handleBookingDataChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Scheduled Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('booking.scheduledTime')} *
                </label>
                <input
                  type="time"
                  name="scheduled_time"
                  value={bookingData.scheduled_time}
                  onChange={handleBookingDataChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('payment.paymentMethod')} *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${
                bookingData.payment_method === 'cash'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="cash"
                  checked={bookingData.payment_method === 'cash'}
                  onChange={handleBookingDataChange}
                  className="sr-only"
                />
                <div>
                  <div className="font-semibold">💵 Cash</div>
                  <div className="text-xs text-gray-600 mt-1">{t('payment.payAfterService')}</div>
                </div>
              </label>
              <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer ${
                bookingData.payment_method === 'online'
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="online"
                  checked={bookingData.payment_method === 'online'}
                  onChange={handleBookingDataChange}
                  className="sr-only"
                />
                <div>
                  <div className="font-semibold">💳 Online</div>
                  <div className="text-xs text-gray-600 mt-1">{t('payment.onlinePaymentMethods')}</div>
                </div>
              </label>
            </div>
          </div>

          {/* Estimated Price */}
          {worker.hourly_rate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>{t('booking.estimatedPrice')}:</strong> ৳{typeof worker.hourly_rate === 'number' ? worker.hourly_rate : parseFloat(worker.hourly_rate || 0)}/{t('workerDetails.perHour')}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowBookingModal(false)}
              className="flex-1 btn-secondary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              {t('cart.addToCart')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WorkerDetails;