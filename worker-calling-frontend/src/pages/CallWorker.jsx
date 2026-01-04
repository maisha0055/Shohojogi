import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import bookingService from '../services/bookingService';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import Loader from '../components/common/Loader';
import { toast } from 'react-toastify';
import { reverseGeocodeOSM } from '../utils/osmGeocoding';

const CallWorker = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addEstimateToCart } = useCart();
  const { socket, connected, on, off } = useSocket();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const fileInputRef = useRef(null);
  const [callData, setCallData] = useState({
    service_category_id: '',
    service_description: '',
    service_location: '',
    location_latitude: null,
    location_longitude: null,
    payment_method: 'cash',
  });
  // Load activeCall from localStorage on mount
  const [activeCall, setActiveCall] = useState(() => {
    try {
      const saved = localStorage.getItem('activeInstantCall');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if the call is recent (within last 24 hours)
        const callTime = new Date(parsed.timestamp);
        const now = new Date();
        const hoursDiff = (now - callTime) / (1000 * 60 * 60);
        if (hoursDiff < 24 && parsed.booking_id) {
          return parsed;
        } else {
          // Clear old call data
          localStorage.removeItem('activeInstantCall');
          return null;
        }
      }
    } catch (error) {
      console.error('Error loading active call from localStorage:', error);
      localStorage.removeItem('activeInstantCall');
    }
    return null;
  });
  const [estimates, setEstimates] = useState([]);
  const [loadingEstimates, setLoadingEstimates] = useState(false);

  // Save activeCall to localStorage whenever it changes
  useEffect(() => {
    if (activeCall && activeCall.booking_id) {
      try {
        localStorage.setItem('activeInstantCall', JSON.stringify(activeCall));
      } catch (error) {
        console.error('Error saving active call to localStorage:', error);
      }
    } else {
      // Clear localStorage when activeCall is cleared
      localStorage.removeItem('activeInstantCall');
    }
  }, [activeCall]);

  useEffect(() => {
    fetchCategories();
    
    // Listen for new estimates
    if (socket && connected && activeCall) {
      const handleNewEstimate = (data) => {
        setEstimates(prev => [...prev, {
          worker_id: data.worker_id,
          worker_name: data.worker_name,
          worker_photo: data.worker_photo,
          worker_rating: data.worker_rating,
          worker_reviews: data.worker_reviews,
          estimated_price: data.estimated_price,
          note: data.note,
          created_at: data.created_at
        }]);
        toast.info(t('callWorker.newEstimateReceived', { workerName: data.worker_name, price: data.estimated_price }).replace('{{workerName}}', data.worker_name).replace('{{price}}', data.estimated_price));
      };

      const handleWorkerSelected = (data) => {
        // Clear activeCall and localStorage when worker is selected
        setActiveCall(null);
        localStorage.removeItem('activeInstantCall');
        toast.success(t('bookings.workerSelectedSuccessfully'));
        navigate('/bookings');
      };

      on('booking:new-estimate', handleNewEstimate);
      on('booking:worker-selected', handleWorkerSelected);
      
      return () => {
        off('booking:new-estimate', handleNewEstimate);
        off('booking:worker-selected', handleWorkerSelected);
      };
    }
  }, [socket, connected, on, off, navigate, activeCall]);

  // Verify booking status on mount if activeCall exists
  const verifyBookingStatus = async () => {
    if (!activeCall?.booking_id) return;
    
    try {
      const response = await bookingService.getBookingById(activeCall.booking_id);
      if (response.success) {
        const booking = response.data;
        // If booking is completed, cancelled, or worker is already selected, clear activeCall
        if (booking.status !== 'pending_estimation' && booking.status !== 'pending') {
          setActiveCall(null);
          localStorage.removeItem('activeInstantCall');
          toast.info('This call request has been completed or cancelled.');
        }
      } else {
        // Booking not found, clear activeCall
        setActiveCall(null);
        localStorage.removeItem('activeInstantCall');
      }
    } catch (error) {
      console.error('Error verifying booking status:', error);
      // If booking doesn't exist (404), clear activeCall
      if (error.response?.status === 404) {
        setActiveCall(null);
        localStorage.removeItem('activeInstantCall');
      }
    }
  };

  // Fetch estimates when activeCall changes or on mount if activeCall exists
  useEffect(() => {
    if (activeCall && activeCall.booking_id) {
      fetchEstimates();
      // Also verify the booking still exists and is in pending state
      verifyBookingStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchEstimates = async () => {
    if (!activeCall?.booking_id) return;
    
    try {
      setLoadingEstimates(true);
      const response = await bookingService.getBookingEstimates(activeCall.booking_id);
      if (response.success) {
        setEstimates(response.data.estimates);
      }
    } catch (error) {
      console.error('Error fetching estimates:', error);
    } finally {
      setLoadingEstimates(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCallData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    if (images.length + files.length > 3) {
      toast.error(t('callWorker.max3Images'));
      return;
    }

    const newImages = [...images, ...files.slice(0, 3 - images.length)];
    setImages(newImages);

    // Create preview URLs
    const newUrls = newImages.map(file => URL.createObjectURL(file));
    setImageUrls(newUrls);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newUrls = imageUrls.filter((_, i) => i !== index);
    setImages(newImages);
    setImageUrls(newUrls);
    
    // Revoke object URL to free memory
    URL.revokeObjectURL(imageUrls[index]);
  };


  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      if (!window.isSecureContext) {
        toast.error(t('workerDetails.gpsRequiresHttps'));
        return;
      }

      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          let addr = null;
          try {
            addr = await reverseGeocodeOSM({ lat, lng });
          } catch (e) {
            console.warn('Reverse geocoding failed:', e);
          }

          setCallData((prev) => ({
            ...prev,
            location_latitude: lat,
            location_longitude: lng,
            service_location: prev.service_location?.trim() ? prev.service_location : (addr || prev.service_location),
          }));

          setLoading(false);
          toast.success(t('workerDetails.locationCaptured'));
        },
        (error) => {
          console.error('Error getting location:', error);
          setLoading(false);
          if (error?.code === 1) toast.error(t('workerDetails.locationPermissionDenied'));
          else if (error?.code === 2) toast.error(t('callWorker.locationUnavailable'));
          else if (error?.code === 3) toast.error(t('workerDetails.locationTimeout'));
          else toast.error(t('workerDetails.failedToGetLocation'));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    } else {
      toast.error(t('workerDetails.geolocationNotSupported'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!callData.service_category_id || !callData.service_description || !callData.service_location) {
      toast.error(t('callWorker.fillAllRequiredFields'));
      return;
    }

    if (images.length === 0) {
      toast.error(t('callWorker.uploadAtLeast1Image'));
      return;
    }

    try {
      setSubmitting(true);
      
      // Send images as files (not base64) - backend will handle Cloudinary or base64 conversion
      const requestData = {
        ...callData
      };

      const response = await bookingService.callWorker(requestData, images);
      
      if (response.success) {
        const newActiveCall = {
          booking_id: response.data.booking.id,
          workers_notified: response.data.workers_notified,
          timestamp: new Date().toISOString(),
        };
        setActiveCall(newActiveCall);
        // Save to localStorage immediately
        try {
          localStorage.setItem('activeInstantCall', JSON.stringify(newActiveCall));
        } catch (error) {
          console.error('Error saving active call to localStorage:', error);
        }
        toast.success(`Request sent to ${response.data.workers_notified} workers. Waiting for estimates...`);
      }
    } catch (error) {
      console.error('Error calling worker:', error);
      toast.error(error.response?.data?.message || t('booking.failedToCallWorkers'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectWorker = async (workerId) => {
    if (!activeCall?.booking_id) return;

    try {
      setLoadingEstimates(true);
      // Get estimate data for cart
      const response = await bookingService.getEstimateCartData(activeCall.booking_id, workerId);
      
      if (response.success) {
        // Add to cart
        addEstimateToCart(response.data);
        // Clear activeCall and localStorage when worker is selected
        setActiveCall(null);
        localStorage.removeItem('activeInstantCall');
        // Navigate to cart
        navigate('/cart');
      }
    } catch (error) {
      console.error('Error adding estimate to cart:', error);
      toast.error(error.response?.data?.message || t('bookings.failedToAddEstimateToCart'));
    } finally {
      setLoadingEstimates(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 text-primary-600 hover:text-primary-700"
        >
          ← {t('callWorker.backToDashboard')}
        </button>

        <div className="card">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">📞</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('booking.callWorkersTitle')}
            </h1>
            <p className="text-gray-600">
              {t('callWorker.uploadImagesAndGetEstimates')}
            </p>
          </div>

          {activeCall && activeCall.booking_id ? (
            <div className="space-y-6">
              {/* Waiting for Estimates */}
              {estimates.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <div className="text-center">
                    <div className="text-4xl mb-4 animate-pulse">⏳</div>
                    <h3 className="text-xl font-semibold mb-2">{t('callWorker.waitingForEstimates')}</h3>
                    <p className="text-gray-600 mb-4">
                      {t('callWorker.requestSentToWorkers', { count: activeCall.workers_notified }).replace('{{count}}', activeCall.workers_notified)}
                      <br />
                      {t('callWorker.workersReviewingImages')}
                    </p>
                    {loadingEstimates && <Loader />}
                  </div>
                </div>
              )}

              {/* Worker Estimates List */}
              {estimates.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {t('callWorker.workerEstimates')} ({estimates.length})
                  </h3>
                  {estimates.map((estimate, index) => (
                    <div key={estimate.id || index} className="bg-white border-2 border-gray-200 rounded-lg p-5 hover:border-primary-400 hover:shadow-lg transition-all">
                      <div className="flex items-start gap-4">
                        {/* Worker Photo */}
                        <div className="flex-shrink-0">
                          {estimate.worker_photo ? (
                            <img
                              src={estimate.worker_photo}
                              alt={estimate.worker_name}
                              className="w-16 h-16 rounded-full object-cover border-2 border-primary-200"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl font-bold border-2 border-primary-200">
                              {estimate.worker_name?.charAt(0).toUpperCase() || 'W'}
                            </div>
                          )}
                        </div>
                        
                        {/* Worker Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-bold text-lg text-gray-900">{estimate.worker_name}</h4>
                            {estimate.average_rating && (
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                ⭐ {parseFloat(estimate.average_rating).toFixed(1)}
                                {estimate.total_reviews && (
                                  <span className="text-gray-500">({estimate.total_reviews} reviews)</span>
                                )}
                              </span>
                            )}
                          </div>
                          
                          {/* Price */}
                          <div className="text-3xl font-bold text-primary-600 mb-3">
                            ৳{parseFloat(estimate.estimated_price).toLocaleString()}
                          </div>
                          
                          {/* Note */}
                          {estimate.note && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                              <p className="text-sm text-gray-700 italic">"{estimate.note}"</p>
                            </div>
                          )}
                          
                          {/* Experience */}
                          {estimate.experience_years && (
                            <p className="text-xs text-gray-500 mb-2">
                              💼 {estimate.experience_years} {t('callWorker.yearsOfExperience')}
                            </p>
                          )}
                          
                          {/* Submitted Time */}
                          <p className="text-xs text-gray-400">
                            📅 {t('bookings.submitted')} {new Date(estimate.created_at).toLocaleString()}
                          </p>
                        </div>
                        
                        {/* Select Button */}
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleSelectWorker(estimate.worker_id)}
                            disabled={loadingEstimates}
                            className="btn-primary px-6 py-3 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingEstimates ? t('callWorker.selecting') : `✓ ${t('callWorker.selectWorker')}`}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Service Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('callWorker.serviceCategory')} *
                </label>
                <select
                  name="service_category_id"
                  value={callData.service_category_id}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">{t('callWorker.selectServiceCategory')}</option>
                  {(categories || []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name_en || category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('booking.serviceDescription')} *
                </label>
                <textarea
                  name="service_description"
                  value={callData.service_description}
                  onChange={handleChange}
                  rows={4}
                  className="input-field"
                  placeholder={t('workerDetails.describeWorkNeeded')}
                  required
                />
              </div>

              {/* Image Upload */}
              <div className="bg-white border border-gray-300 rounded-lg p-4" data-lang={language}>
                <label key={`upload-label-${language}`} className="block text-sm font-medium text-gray-700 mb-3">
                  📸 {t('callWorker.uploadImagesOfServiceProblem')} *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload-input"
                />
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={images.length >= 3}
                      className="flex-1 py-4 px-6 border-2 border-dashed border-primary-400 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-primary-50/30"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl">📷</span>
                        <span key={`upload-text-${language}`} className="font-medium text-gray-700">
                          {images.length === 0 
                            ? t('callWorker.clickToUploadImages') 
                            : t('callWorker.addMoreImages', { count: images.length }).replace('{{count}}', images.length)}
                        </span>
                        <span key={`camera-gallery-${language}`} className="text-xs text-gray-500">
                          {t('callWorker.cameraOrGallery')}
                        </span>
                      </div>
                    </button>
                  </div>
                  
                  {imageUrls.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        {t('callWorker.uploadedImages')} ({imageUrls.length}/3):
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {imageUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 hover:border-primary-400 transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              title={t('callWorker.removeImage')}
                            >
                              ×
                            </button>
                            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                              {t('callWorker.image')} {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {images.length === 0 && (
                    <div key={`required-warning-${language}`} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                      <p className="text-sm text-yellow-800">
                        ⚠️ <strong>{t('callWorker.required')}:</strong> {t('callWorker.uploadAtLeast1Image')}. 
                        {t('callWorker.workersNeedToSeeIssue')}
                      </p>
                    </div>
                  )}
                </div>
                <p key={`tip-${language}`} className="text-xs text-gray-500 mt-3">
                  💡 <strong>{t('callWorker.tip')}:</strong> {t('callWorker.uploadClearImages')}
                </p>
              </div>

              {/* Service Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('worker.location')} *
                </label>
                <div className="flex gap-2 mb-2">
                  <textarea
                    name="service_location"
                    value={callData.service_location}
                    onChange={handleChange}
                    rows={2}
                    className="input-field flex-1"
                    placeholder={t('workerDetails.addressPlaceholder')}
                    required
                  />
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={loading}
                    className="btn-secondary whitespace-nowrap"
                  >
                    {loading ? t('workerDetails.getting') : `📍 ${t('callWorker.useGPS')}`}
                  </button>
                </div>
                {(callData.location_latitude && callData.location_longitude) && (
                  <p className="text-xs text-gray-500">
                    {t('workerDetails.location')}: {callData.location_latitude.toFixed(6)}, {callData.location_longitude.toFixed(6)}
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('payment.paymentMethod')} *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                      callData.payment_method === 'cash'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="cash"
                      checked={callData.payment_method === 'cash'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div>
                      <div className="font-semibold">💵 Cash</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {t('payment.payAfterService')}
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                      callData.payment_method === 'online'
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="online"
                      checked={callData.payment_method === 'online'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div>
                      <div className="font-semibold">💳 Online</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {t('payment.onlinePaymentMethods')}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-blue-800 text-xl mr-3">ℹ️</span>
                  <div>
                    <p className="text-sm text-blue-800 font-semibold mb-1">
                      {t('booking.howItWorks')}:
                    </p>
                    <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                      <li>{t('booking.provideServiceDescriptionRequired')}</li>
                      <li>{t('booking.uploadImagesRequired')}</li>
                      <li>{t('booking.workersReviewAndSubmitEstimates')}</li>
                      <li>{t('booking.youChooseBestEstimate')}</li>
                      <li>{t('callWorker.selectedWorkerAssigned')}</li>
                      <li>{t('booking.noAutoPriceEstimation')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn-secondary flex-1"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !connected || images.length === 0}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {submitting 
                    ? t('callWorker.submitting') 
                    : connected 
                      ? `📞 ${t('booking.callForWorkerNow')}` 
                      : t('callWorker.connecting')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallWorker;
