import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import LocationPickerLeaflet from '../common/LocationPickerLeaflet';
import api from '../../services/api';
import Loader from '../common/Loader';
import { toast } from 'react-toastify';

const WorkerCallDetailsPanel = ({ isOpen, onClose, bookingId, onBookingCompleted }) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchBookingDetails();
    } else {
      // Reset state when modal closes
      setBooking(null);
      setImages([]);
      setLoading(true);
    }
  }, [isOpen, bookingId]);

  // Check if booking is completed when booking data is loaded
  useEffect(() => {
    if (booking && (booking.status === 'completed' || booking.status === 'cancelled')) {
      if (onBookingCompleted) {
        onBookingCompleted();
      }
    }
  }, [booking, onBookingCompleted]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/bookings/${bookingId}`);
      if (response.data.success) {
        const bookingData = response.data.data;
        setBooking(bookingData);
        
        // Check if booking is completed and notify parent
        if (bookingData.status === 'completed' || bookingData.status === 'cancelled') {
          if (onBookingCompleted) {
            onBookingCompleted();
          }
        }
        
        // Fetch booking images
        if (bookingData.id) {
          try {
            const imagesResponse = await api.get(`/api/bookings/${bookingData.id}/images`);
            if (imagesResponse.data.success) {
              setImages(imagesResponse.data.data.images || []);
            }
          } catch (err) {
            console.warn('Could not fetch images:', err);
            if (bookingData.image_urls) {
              setImages(bookingData.image_urls);
            }
          }
        }
      } else {
        toast.error('Failed to load booking details');
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

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Caller Details & Location"
      size="lg"
    >
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader />
        </div>
      ) : booking ? (
        <div className="space-y-4">
          {/* User/Caller Details */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Caller Information</h3>
            <div className="flex items-start space-x-4">
              {booking.user_profile_photo || booking.user?.profile_photo ? (
                <img
                  src={booking.user_profile_photo || booking.user?.profile_photo}
                  alt={booking.user_name || booking.user?.full_name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary-300"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl font-bold border-2 border-primary-300">
                  {(booking.user_name || booking.user?.full_name)?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1">
                <h4 className="text-xl font-bold text-gray-900">
                  {booking.user_name || booking.user?.full_name}
                </h4>
                {(booking.user_phone || booking.user?.phone) && (
                  <p className="text-gray-700 mt-1">
                    📞 <a href={`tel:${booking.user_phone || booking.user?.phone}`} className="text-primary-600 hover:text-primary-700">
                      {booking.user_phone || booking.user?.phone}
                    </a>
                  </p>
                )}
                {booking.service_category_name && (
                  <p className="text-sm text-gray-600 mt-1">
                    Service: {booking.service_category_name}
                  </p>
                )}
                {booking.booking_number && (
                  <p className="text-xs text-gray-500 mt-1">
                    Booking: {booking.booking_number}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Service Description */}
          {booking.service_description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Service Description</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-gray-900">{booking.service_description}</p>
              </div>
            </div>
          )}

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

          {/* Location Details */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Service Location</h4>
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-gray-900">📍 {booking.service_location}</p>
              {booking.location_latitude && booking.location_longitude && (
                <p className="text-xs text-gray-500 mt-1">
                  Coordinates: {parseFloat(booking.location_latitude).toFixed(6)}, {parseFloat(booking.location_longitude).toFixed(6)}
                </p>
              )}
            </div>
            
            {/* Map showing caller location */}
            {booking.location_latitude && booking.location_longitude && (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <LocationPickerLeaflet
                  initialLocation={{
                    lat: parseFloat(booking.location_latitude),
                    lng: parseFloat(booking.location_longitude)
                  }}
                  height="350px"
                  readOnly={true}
                  onLocationSelect={() => {}}
                />
              </div>
            )}
          </div>

          {/* Booking Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Booking Details</h4>
            <div className="space-y-2 text-sm">
              {booking.estimated_price && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Price:</span>
                  <span className="font-semibold text-gray-900">
                    ৳{parseFloat(booking.estimated_price).toLocaleString()}
                  </span>
                </div>
              )}
              {booking.payment_method && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {booking.payment_method}
                  </span>
                </div>
              )}
              {booking.status && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-semibold ${
                    booking.status === 'accepted' ? 'text-green-600' :
                    booking.status === 'completed' ? 'text-blue-600' :
                    booking.status === 'cancelled' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {booking.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              )}
              {booking.created_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Requested At:</span>
                  <span className="text-gray-900">
                    {new Date(booking.created_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Close
            </button>
            {booking.user_phone || booking.user?.phone ? (
              <a
                href={`tel:${booking.user_phone || booking.user?.phone}`}
                className="flex-1 btn-primary text-center"
              >
                📞 Call Now
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">Booking details not found</p>
        </div>
      )}
    </Modal>
  );
};

export default WorkerCallDetailsPanel;

