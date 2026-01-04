import React, { useState, useEffect } from 'react';
import WorkerCallDetailsPanel from './WorkerCallDetailsPanel';
import { useAuth } from '../../context/AuthContext';
import useSocket from '../../hooks/useSocket';
import api from '../../services/api';
import { toast } from 'react-toastify';

const WorkerCallDetailsButton = () => {
  const { user } = useAuth();
  const { socket, connected, on, off } = useSocket();
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [hasNewBooking, setHasNewBooking] = useState(false);

  // Check booking status periodically and on panel open to hide button if completed
  const checkBookingStatus = async (bookingId) => {
    if (!bookingId) return;
    
    try {
      const response = await api.get(`/api/bookings/${bookingId}`);
      
      if (response.data.success && response.data.data) {
        const booking = response.data.data;
        // Hide button if booking is completed or cancelled
        if (booking.status === 'completed' || booking.status === 'cancelled') {
          setSelectedBookingId(null);
          setShowPanel(false);
          setHasNewBooking(false);
        }
      }
    } catch (error) {
      console.error('Error checking booking status:', error);
      // If booking doesn't exist or access denied, hide button
      if (error.response?.status === 404 || error.response?.status === 403) {
        setSelectedBookingId(null);
        setShowPanel(false);
        setHasNewBooking(false);
      }
    }
  };

  // Listen for when worker is selected by user
  useEffect(() => {
    if (socket && connected && user?.role === 'worker') {
      const handleWorkerSelected = (data) => {
        console.log('[WorkerCallDetailsButton] Worker selected event received:', data);
        if (data.booking_id) {
          setSelectedBookingId(data.booking_id);
          setHasNewBooking(true);
          toast.success('Your estimate has been accepted! Click the button to view caller details.', {
            autoClose: 5000,
            onClick: () => {
              setShowPanel(true);
              setHasNewBooking(false);
            }
          });
        }
      };

      // Listen for booking status updates (e.g., when job is completed)
      const handleBookingStatusUpdate = (data) => {
        console.log('[WorkerCallDetailsButton] Booking status update received:', data);
        if (data.booking_id === selectedBookingId) {
          if (data.status === 'completed' || data.status === 'cancelled') {
            setSelectedBookingId(null);
            setShowPanel(false);
            setHasNewBooking(false);
          }
        }
      };

      on('booking:worker-selected', handleWorkerSelected);
      on('booking:status-updated', handleBookingStatusUpdate);
      on('booking:completed', handleBookingStatusUpdate);

      return () => {
        off('booking:worker-selected', handleWorkerSelected);
        off('booking:status-updated', handleBookingStatusUpdate);
        off('booking:completed', handleBookingStatusUpdate);
      };
    }
  }, [socket, connected, user?.role, on, off, selectedBookingId]);

  // Periodically check booking status
  useEffect(() => {
    if (selectedBookingId) {
      // Check immediately when booking ID changes
      checkBookingStatus(selectedBookingId);
      
      // Then check every 10 seconds
      const interval = setInterval(() => {
        checkBookingStatus(selectedBookingId);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [selectedBookingId]);

  // Don't show button if user is not a worker
  if (!user || user.role !== 'worker') {
    return null;
  }

  // Don't show button if no booking is selected
  if (!selectedBookingId) {
    return null;
  }

  return (
    <>
      {/* Floating Popup Button */}
      <button
        onClick={() => {
          setShowPanel(true);
          setHasNewBooking(false);
        }}
        className={`fixed bottom-6 right-6 z-50 px-6 py-4 bg-primary-500 text-white rounded-full shadow-2xl hover:bg-primary-600 transition-all duration-300 flex items-center space-x-3 ${
          hasNewBooking ? 'animate-bounce' : 'hover:scale-110'
        }`}
        style={{
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}
      >
        <span className="text-2xl">📞</span>
        <div className="text-left">
          <div className="font-semibold text-sm">View Caller Details</div>
          {hasNewBooking && (
            <div className="text-xs opacity-90">New booking!</div>
          )}
        </div>
        {hasNewBooking && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
            !
          </span>
        )}
      </button>

      {/* Call Details Panel */}
      {selectedBookingId && (
        <WorkerCallDetailsPanel
          isOpen={showPanel}
          onClose={() => {
            setShowPanel(false);
            // Check booking status when panel is closed
            checkBookingStatus(selectedBookingId);
          }}
          bookingId={selectedBookingId}
          onBookingCompleted={() => {
            // Hide button when booking is completed from panel
            setSelectedBookingId(null);
            setShowPanel(false);
            setHasNewBooking(false);
          }}
        />
      )}
    </>
  );
};

export default WorkerCallDetailsButton;

