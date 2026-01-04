import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import LocationPickerLeaflet from '../common/LocationPickerLeaflet';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import Loader from '../common/Loader';

const WorkerAcceptedModal = ({ isOpen, onClose, bookingId, workerId }) => {
  const { t } = useLanguage();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && workerId) {
      fetchWorkerDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workerId]);

  const fetchWorkerDetails = async () => {
    try {
      setLoading(true);
      // Fetch both worker details and booking details to get locations
      const [workerResponse, bookingResponse] = await Promise.all([
        api.get(`/api/workers/${workerId}`),
        bookingId ? api.get(`/api/bookings/${bookingId}`).catch(() => null) : Promise.resolve(null)
      ]);
      
      if (workerResponse.data.success) {
        const workerData = workerResponse.data.data;
        // If booking data is available, include user location
        if (bookingResponse?.data?.success) {
          const booking = bookingResponse.data.data;
          setWorker({
            ...workerData,
            // User location from booking
            userLocation: booking.location_latitude && booking.location_longitude ? {
              lat: parseFloat(booking.location_latitude),
              lng: parseFloat(booking.location_longitude),
              address: booking.service_location
            } : null
          });
        } else {
          setWorker(workerData);
        }
      } else {
        setError(t('bookingModals.failedToLoadWorker'));
      }
    } catch (err) {
      console.error('Error fetching worker details:', err);
      setError('Failed to load worker details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('bookingModals.workerAccepted')} size="lg">
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      ) : worker ? (
        <div className="space-y-4">
          {/* Worker Details */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start space-x-4">
              {worker.profile_photo ? (
                <img
                  src={worker.profile_photo}
                  alt={worker.full_name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl font-bold">
                  {worker.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{worker.full_name}</h3>
                <p className="text-gray-600">{worker.phone}</p>
                {worker.average_rating > 0 && (
                  <div className="flex items-center mt-2">
                    <span className="text-yellow-400 text-lg">★</span>
                    <span className="ml-1 font-semibold">
                      {worker.average_rating.toFixed(1)} ({worker.total_reviews} {t('worker.reviews')})
                    </span>
                  </div>
                )}
                {worker.hourly_rate && (
                  <p className="text-primary-600 font-semibold mt-1">
                    ৳{worker.hourly_rate}/hour
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* User Location Map (where worker needs to go) */}
          {worker.userLocation && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
📍 {t('bookingModals.serviceLocation')}
              </h4>
              <LocationPickerLeaflet
                initialLocation={worker.userLocation}
                height="300px"
                readOnly={true}
                onLocationSelect={() => {}}
              />
              <p className="mt-2 text-sm text-gray-600">{worker.userLocation.address}</p>
            </div>
          )}

          {/* Worker Location Map (if available) */}
          {worker.latitude && worker.longitude && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
{t('bookingModals.workerCurrentLocation')}
              </h4>
              <LocationPickerLeaflet
                initialLocation={{
                  lat: parseFloat(worker.latitude),
                  lng: parseFloat(worker.longitude)
                }}
                height="300px"
                readOnly={true}
                onLocationSelect={() => {}}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 btn-primary"
            >
{t('bookingModals.gotIt')}
            </button>
            <button
              onClick={() => {
                window.location.href = `/bookings`;
              }}
              className="flex-1 btn-secondary"
            >
{t('bookingModals.viewBooking')}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default WorkerAcceptedModal;

