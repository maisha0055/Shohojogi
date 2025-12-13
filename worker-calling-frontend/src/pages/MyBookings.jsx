import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import bookingService from '../services/bookingService';
import Loader from '../components/common/Loader';
import { toast } from 'react-toastify';

const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchBookings = async () => {
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
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    try {
      setActionLoading(true);
      await bookingService.acceptBooking(bookingId);
      toast.success('Booking accepted!');
      fetchBookings();
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to accept booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBooking = async (bookingId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setActionLoading(true);
      await bookingService.rejectBooking(bookingId, reason);
      toast.success('Booking rejected');
      fetchBookings();
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to reject booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartJob = async (bookingId) => {
    try {
      setActionLoading(true);
      await bookingService.startJob(bookingId);
      toast.success('Job started!');
      fetchBookings();
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to start job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJob = async (bookingId) => {
    const finalPrice = prompt('Enter final price (৳):');
    if (!finalPrice || isNaN(finalPrice)) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      setActionLoading(true);
      await bookingService.completeJob(bookingId, parseFloat(finalPrice));
      toast.success('Job completed successfully!');
      fetchBookings();
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to complete job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    const reason = prompt('Please provide a cancellation reason:');
    if (!reason) return;

    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        setActionLoading(true);
        await bookingService.cancelBooking(bookingId, reason);
        toast.success('Booking cancelled');
        fetchBookings();
        setShowModal(false);
      } catch (error) {
        toast.error('Failed to cancel booking');
      } finally {
        setActionLoading(false);
      }
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
            Accept
          </button>
          <button
            onClick={() => handleRejectBooking(booking.id)}
            className="btn-secondary text-sm"
            disabled={actionLoading}
          >
            Reject
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
          Start Job
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
          Complete Job
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
          Cancel Booking
        </button>
      );
    }

    if (booking.status === 'completed' && !isWorker) {
      return (
        <button
          onClick={() => window.location.href = '/reviews/new?booking=' + booking.id}
          className="btn-primary text-sm"
        >
          Leave Review
        </button>
      );
    }

    return null;
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.role === 'worker' ? 'My Jobs' : 'My Bookings'}
          </h1>
          <p className="mt-2 text-gray-600">
            {user?.role === 'worker'
              ? 'Manage your job requests and ongoing work'
              : 'Track your service bookings'}
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
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
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
              No bookings found
            </h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'You haven\'t made any bookings yet'
                : `No ${filter} bookings`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
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
                            {booking.status.replace('_', ' ')}
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
                        {booking.payment_method === 'cash' ? 'Cash' : 'Online'}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Created: {new Date(booking.created_at).toLocaleDateString()}
                    </div>
                  </div>

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
                      View Details
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
                  <h2 className="text-2xl font-bold">Booking Details</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Booking Number</label>
                    <p className="text-gray-900">#{selectedBooking.booking_number}</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      {user?.role === 'worker' ? 'Customer' : 'Worker'}
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
                    <label className="text-sm font-semibold text-gray-700">Service Description</label>
                    <p className="text-gray-900">{selectedBooking.service_description}</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Location</label>
                    <p className="text-gray-900">{selectedBooking.service_location}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Booking Type</label>
                      <p className="text-gray-900 capitalize">{selectedBooking.booking_type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Status</label>
                      <p className="text-gray-900 capitalize">{selectedBooking.status.replace('_', ' ')}</p>
                    </div>
                  </div>

                  {selectedBooking.scheduled_date && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Scheduled For</label>
                      <p className="text-gray-900">
                        {new Date(selectedBooking.scheduled_date).toLocaleDateString()} at {selectedBooking.scheduled_time}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Estimated Price</label>
                      <p className="text-gray-900">৳{selectedBooking.estimated_price}</p>
                    </div>
                    {selectedBooking.final_price && (
                      <div>
                        <label className="text-sm font-semibold text-gray-700">Final Price</label>
                        <p className="text-gray-900">৳{selectedBooking.final_price}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Payment Method</label>
                    <p className="text-gray-900 capitalize">{selectedBooking.payment_method}</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  {getActionButtons(selectedBooking)}
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;