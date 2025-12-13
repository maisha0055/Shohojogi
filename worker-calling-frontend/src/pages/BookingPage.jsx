import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import workerService from '../services/workerService';
import bookingService from '../services/bookingService';
import api from '../services/api';
import Loader from '../components/common/Loader';
import { toast } from 'react-toastify';

const BookingPage = () => {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState({
    booking_type: 'instant',
    service_description: '',
    service_location: '',
    scheduled_date: '',
    scheduled_time: '',
    payment_method: 'cash',
  });

  useEffect(() => {
    fetchWorkerDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  const fetchWorkerDetails = async () => {
    try {
      const response = await workerService.getWorkerById(workerId);
      if (response.success) {
        setWorker(response.data);
      }
    } catch (error) {
      console.error('Error fetching worker:', error);
      toast.error('Failed to load worker details');
    } finally {
      setLoading(false);
    }
  };


  const handleChange = (e) => {
    setBookingData({
      ...bookingData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!bookingData.service_description || !bookingData.service_location) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (bookingData.booking_type === 'scheduled') {
      if (!bookingData.scheduled_date || !bookingData.scheduled_time) {
        toast.error('Please select date and time for scheduled booking');
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        worker_id: workerId,
        service_category_id: worker.service_category_id,
        ...bookingData,
      };

      const response = await bookingService.createBooking(payload);
      
      if (response.success) {
        toast.success('Booking created successfully!');
        navigate('/bookings');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
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
          <h2 className="text-2xl font-bold mb-2">Worker not found</h2>
          <button onClick={() => navigate('/workers')} className="btn-primary">
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(`/workers/${workerId}`)}
          className="mb-6 text-primary-600 hover:text-primary-700"
        >
          ← Back to Worker Profile
        </button>

        <div className="card">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Book Service
          </h1>

          {/* Worker Info Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-4">
              {worker.profile_photo ? (
                <img
                  src={worker.profile_photo}
                  alt={worker.full_name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary-600">
                    {worker.full_name?.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg">{worker.full_name}</h3>
                <p className="text-gray-600">{worker.service_category_name}</p>
                <div className="flex items-center mt-1">
                  <span className="text-yellow-400">★</span>
                  <span className="ml-1 text-sm">
                    {worker.average_rating ? parseFloat(worker.average_rating).toFixed(1) : '0.0'} ({worker.total_reviews || 0} reviews)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Booking Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Booking Type *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    bookingData.booking_type === 'instant'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="booking_type"
                    value="instant"
                    checked={bookingData.booking_type === 'instant'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-2xl mb-2">⚡</div>
                    <div className="font-semibold">Instant Booking</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Worker arrives ASAP
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    bookingData.booking_type === 'scheduled'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="booking_type"
                    value="scheduled"
                    checked={bookingData.booking_type === 'scheduled'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-2xl mb-2">📅</div>
                    <div className="font-semibold">Scheduled Booking</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Pick date & time
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Schedule (if scheduled booking) */}
            {bookingData.booking_type === 'scheduled' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="scheduled_date"
                    value={bookingData.scheduled_date}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    name="scheduled_time"
                    value={bookingData.scheduled_time}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>
              </div>
            )}

            {/* Service Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Description *
              </label>
              <textarea
                name="service_description"
                value={bookingData.service_description}
                onChange={handleChange}
                rows={4}
                className="input-field"
                placeholder="Describe what work needs to be done..."
                required
              />
            </div>

            {/* Service Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Location *
              </label>
              <textarea
                name="service_location"
                value={bookingData.service_location}
                onChange={handleChange}
                rows={2}
                className="input-field"
                placeholder="House 12, Road 5, Dhanmondi, Dhaka"
                required
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                    bookingData.payment_method === 'cash'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash"
                    checked={bookingData.payment_method === 'cash'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div>
                    <div className="font-semibold">💵 Cash</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Pay after service completion
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer ${
                    bookingData.payment_method === 'online'
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="online"
                    checked={bookingData.payment_method === 'online'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div>
                    <div className="font-semibold">💳 Online</div>
                    <div className="text-xs text-gray-600 mt-1">
                      bKash, Nagad, Card
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Estimated Price Info */}
            {worker.hourly_rate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-blue-800">ℹ️</span>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>Hourly Rate:</strong> ৳{worker.hourly_rate}/hour
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Final price will be confirmed after service assessment
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(`/workers/${workerId}`)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {submitting ? 'Creating Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;