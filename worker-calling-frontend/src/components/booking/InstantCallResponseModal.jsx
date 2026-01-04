import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Loader from '../common/Loader';
import bookingService from '../../services/bookingService';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useSocket from '../../hooks/useSocket';

const InstantCallResponseModal = ({ isOpen, onClose, bookingId, workersNotified }) => {
  const navigate = useNavigate();
  const { addEstimateToCart } = useCart();
  const { socket, connected, on, off } = useSocket();
  const [estimates, setEstimates] = useState([]);
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);

  // Fetch estimates when modal opens
  useEffect(() => {
    if (isOpen && bookingId) {
      fetchEstimates();
    } else {
      // Reset state when modal closes
      setEstimates([]);
      setLoadingEstimates(true);
      setSelectedWorkerId(null);
    }
  }, [isOpen, bookingId]);

  // Listen for new estimates via socket
  useEffect(() => {
    if (socket && connected && isOpen && bookingId) {
      const handleNewEstimate = (data) => {
        // Only add if this estimate is for our booking
        if (data.booking_id === bookingId) {
          // Check if estimate already exists
          setEstimates(prev => {
            const exists = prev.find(e => e.worker_id === data.worker_id);
            if (exists) return prev;
            
            return [...prev, {
              id: data.id || Date.now(),
              worker_id: data.worker_id,
              worker_name: data.worker_name,
              worker_photo: data.worker_photo,
              average_rating: data.worker_rating || data.average_rating,
              worker_reviews: data.worker_reviews || data.total_reviews,
              estimated_price: data.estimated_price,
              note: data.note,
              created_at: data.created_at || new Date().toISOString()
            }];
          });
          
          toast.info(`New estimate from ${data.worker_name}: ৳${data.estimated_price}`);
        }
      };

      const handleWorkerSelected = (data) => {
        if (data.booking_id === bookingId) {
          toast.success('Worker selected successfully!');
          // Optionally close modal or show success message
        }
      };

      on('booking:new-estimate', handleNewEstimate);
      on('booking:worker-selected', handleWorkerSelected);

      return () => {
        off('booking:new-estimate', handleNewEstimate);
        off('booking:worker-selected', handleWorkerSelected);
      };
    }
  }, [socket, connected, isOpen, bookingId, on, off]);

  const fetchEstimates = async () => {
    if (!bookingId) return;
    
    try {
      setLoadingEstimates(true);
      const response = await bookingService.getBookingEstimates(bookingId);
      if (response.success) {
        setEstimates(response.data.estimates || []);
      }
    } catch (error) {
      console.error('Error fetching estimates:', error);
      toast.error('Failed to load estimates');
    } finally {
      setLoadingEstimates(false);
    }
  };

  const handleSelectWorker = async (workerId) => {
    if (!bookingId || !workerId) return;

    try {
      setActionLoading(true);
      setSelectedWorkerId(workerId);
      
      // Get estimate data for cart
      const response = await bookingService.getEstimateCartData(bookingId, workerId);
      
      if (response.success) {
        // Add to cart
        addEstimateToCart(response.data);
        toast.success('Estimate added to cart!');
        
        // Close modal and navigate to cart
        onClose();
        navigate('/cart');
      }
    } catch (error) {
      console.error('Error selecting worker:', error);
      toast.error(error.response?.data?.message || 'Failed to add estimate to cart');
      setSelectedWorkerId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectEstimate = (workerId) => {
    // Simply remove from local state (backend will handle rejection when another is selected)
    setEstimates(prev => prev.filter(e => e.worker_id !== workerId));
    toast.info('Estimate removed from view');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Worker Responses"
      size="lg"
    >
      <div className="space-y-4">
        {/* Header Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold text-blue-900">
                Request sent to {workersNotified || 0} workers
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Workers are reviewing your request and submitting estimates...
              </p>
            </div>
            <button
              onClick={fetchEstimates}
              disabled={loadingEstimates}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 px-3 py-1 border border-blue-300 rounded"
            >
              {loadingEstimates ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loadingEstimates && estimates.length === 0 ? (
          <div className="text-center py-12">
            <Loader />
            <p className="mt-4 text-gray-600">Loading estimates...</p>
          </div>
        ) : estimates.length === 0 ? (
          /* Waiting for Responses */
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="text-5xl mb-4 animate-pulse">⏳</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Waiting for Worker Responses...
            </h3>
            <p className="text-gray-600 mb-4">
              Your request has been sent to {workersNotified || 0} workers in this category.
              <br />
              They are reviewing your images and will submit their estimates soon.
            </p>
            <p className="text-sm text-gray-500">
              You can close this panel and check back later, or keep it open to see responses in real-time.
            </p>
          </div>
        ) : (
          /* Estimates List */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Received Estimates ({estimates.length})
              </h3>
              {estimates.length > 0 && (
                <span className="text-sm text-gray-500">
                  Click "Accept" to proceed to cart
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {estimates.map((estimate, index) => (
                <div
                  key={estimate.id || estimate.worker_id || index}
                  className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-primary-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Worker Photo */}
                    <div className="flex-shrink-0">
                      {estimate.worker_photo ? (
                        <img
                          src={estimate.worker_photo}
                          alt={estimate.worker_name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-primary-200"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl font-bold border-2 border-primary-200">
                          {estimate.worker_name?.charAt(0).toUpperCase() || 'W'}
                        </div>
                      )}
                    </div>

                    {/* Worker Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 text-lg truncate">
                          {estimate.worker_name}
                        </h4>
                        {estimate.average_rating && (
                          <span className="text-sm text-gray-600 flex items-center gap-1 flex-shrink-0">
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
                          <p className="text-sm text-gray-700 italic">
                            "{estimate.note}"
                          </p>
                        </div>
                      )}

                      {/* Submitted Time */}
                      <p className="text-xs text-gray-400">
                        Submitted {new Date(estimate.created_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex-shrink-0 flex flex-col gap-2">
                      <button
                        onClick={() => handleSelectWorker(estimate.worker_id)}
                        disabled={actionLoading || selectedWorkerId === estimate.worker_id}
                        className="btn-primary px-4 py-2 whitespace-nowrap text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading && selectedWorkerId === estimate.worker_id
                          ? 'Adding...'
                          : '✓ Accept'}
                      </button>
                      <button
                        onClick={() => handleRejectEstimate(estimate.worker_id)}
                        disabled={actionLoading}
                        className="btn-secondary px-4 py-2 whitespace-nowrap text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
            disabled={actionLoading}
          >
            Close
          </button>
          {estimates.length > 0 && (
            <button
              onClick={() => {
                navigate('/cart');
                onClose();
              }}
              className="flex-1 btn-primary"
            >
              View Cart
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default InstantCallResponseModal;

