import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import LocationPickerLeaflet from '../common/LocationPickerLeaflet';
import { useLanguage } from '../../context/LanguageContext';
import bookingService from '../../services/bookingService';
import api from '../../services/api';
import Loader from '../common/Loader';
import { toast } from 'react-toastify';

const CallRequestModal = ({ isOpen, onClose, bookingId, onAccepted }) => {
  const { t } = useLanguage();
  const [booking, setBooking] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [estimate, setEstimate] = useState({
    estimated_price: '',
    note: ''
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchBookingDetails();
      setHasSubmitted(false);
      setEstimate({ estimated_price: '', note: '' });
    }
  }, [isOpen, bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/bookings/${bookingId}`);
      if (response.data.success) {
        const bookingData = response.data.data;
        setBooking(bookingData);
        
        // Fetch booking images
        if (bookingData.id) {
          try {
            const imagesResponse = await api.get(`/api/bookings/${bookingData.id}/images`);
            if (imagesResponse.data.success) {
              setImages(imagesResponse.data.data.images || []);
            }
          } catch (err) {
            console.warn('Could not fetch images:', err);
            // Images might be in the booking data itself
            if (bookingData.image_urls) {
              setImages(bookingData.image_urls);
            }
          }
        }
      } else {
        toast.error(t('bookings.failedToLoadDetails'));
        onClose();
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast.error('Failed to load booking details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEstimate = async () => {
    if (!estimate.estimated_price || isNaN(parseFloat(estimate.estimated_price)) || parseFloat(estimate.estimated_price) <= 0) {
      toast.error('Please enter a valid estimated price');
      return;
    }

    setSubmitting(true);
    try {
      const response = await bookingService.submitEstimate(bookingId, {
        estimated_price: parseFloat(estimate.estimated_price),
        note: estimate.note || null
      });
      
      if (response.success) {
        toast.success('Your estimate has been submitted!');
        setHasSubmitted(true);
        if (onAccepted) {
          onAccepted(response.data);
        }
        // Don't close modal - let user see confirmation
      }
    } catch (error) {
      console.error('Error submitting estimate:', error);
      toast.error(error.response?.data?.message || 'Failed to submit estimate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    toast.info(t('bookings.requestIgnored'));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('bookingModals.newJobAlert')} size="lg">
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader />
        </div>
      ) : booking ? (
        <div className="space-y-4">
          {/* User Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start space-x-4">
              {booking.user_profile_photo || booking.user?.profile_photo ? (
                <img
                  src={booking.user_profile_photo || booking.user?.profile_photo}
                  alt={booking.user_name || booking.user?.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl font-bold">
                  {(booking.user_name || booking.user?.full_name)?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{booking.user_name || booking.user?.full_name}</h3>
                {(booking.user_phone || booking.user?.phone) && (
                  <p className="text-gray-600">📞 {booking.user_phone || booking.user?.phone}</p>
                )}
                {booking.service_category_name && (
                  <p className="text-sm text-gray-500 mt-1">
                    {t('worker.serviceCategory')}: {booking.service_category_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Service Images */}
          {images.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Service Images</h4>
              <div className="grid grid-cols-2 gap-3">
                {images.map((imageUrl, index) => (
                  <img
                    key={index}
                    src={imageUrl}
                    alt={`Service image ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Service Description */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{t('booking.serviceDescription')}</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-gray-900">{booking.service_description}</p>
            </div>
          </div>

          {/* Location Details */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">{t('bookingModals.serviceLocation')}</h4>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-gray-900">📍 {booking.service_location}</p>
            </div>
            
            {/* Map showing user location */}
            {booking.location_latitude && booking.location_longitude && (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <LocationPickerLeaflet
                  initialLocation={{
                    lat: parseFloat(booking.location_latitude),
                    lng: parseFloat(booking.location_longitude)
                  }}
                  height="250px"
                  readOnly={true}
                  onLocationSelect={() => {}}
                />
              </div>
            )}
          </div>

          {/* Submit Estimate Form */}
          {!hasSubmitted ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
              <h4 className="text-lg font-semibold text-yellow-900 mb-2">
                💰 Submit Your Price Estimate
              </h4>
              
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Estimated Price (BDT) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimate.estimated_price}
                  onChange={(e) => setEstimate(prev => ({ ...prev, estimated_price: e.target.value }))}
                  className="input-field"
                  placeholder="Enter your estimated price"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (Optional)
                </label>
                <textarea
                  value={estimate.note}
                  onChange={(e) => setEstimate(prev => ({ ...prev, note: e.target.value }))}
                  rows={3}
                  className="input-field"
                  placeholder="Add any notes about the service..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✕ {t('worker.decline')}
                </button>
                <button
                  onClick={handleSubmitEstimate}
                  disabled={submitting || !estimate.estimated_price}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : '✓ Submit Estimate'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-4xl mb-2">✅</div>
              <h4 className="text-lg font-semibold text-green-900 mb-2">
                Estimate Submitted Successfully!
              </h4>
              <p className="text-sm text-green-700 mb-4">
                Your estimate of ৳{estimate.estimated_price} has been sent to the user.
                You'll be notified if they select you.
              </p>
              <button
                onClick={onClose}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{t('bookingModals.bookingNotFound')}</p>
        </div>
      )}
    </Modal>
  );
};

export default CallRequestModal;
