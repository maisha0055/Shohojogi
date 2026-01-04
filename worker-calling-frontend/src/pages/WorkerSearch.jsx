import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import workerService from '../services/workerService';
import api from '../services/api';
import bookingService from '../services/bookingService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import useSocket from '../hooks/useSocket';
import Loader from '../components/common/Loader';
import InstantCallModal from '../components/booking/InstantCallModal';
import InstantCallResponseModal from '../components/booking/InstantCallResponseModal';
import WorkerAcceptedModal from '../components/booking/WorkerAcceptedModal';
import { toast } from 'react-toastify';

const WorkerSearch = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { socket, connected, on, off } = useSocket();
  const [workers, setWorkers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [showInstantCallModal, setShowInstantCallModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseModalData, setResponseModalData] = useState(null);
  const [acceptedWorker, setAcceptedWorker] = useState(null);
  const [showWorkerAcceptedModal, setShowWorkerAcceptedModal] = useState(false);
  const [filters, setFilters] = useState({
    service_category_id: searchParams.get('category') || '',
    availability_status: '',
    min_rating: '',
    search: '',
  });

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    // Listen for call acceptance
    if (socket && connected && activeCall) {
      const handleCallAccepted = (data) => {
        setAcceptedWorker({
          workerId: data.worker_id,
          bookingId: data.booking_id || activeCall.booking_id
        });
        setShowWorkerAcceptedModal(true);
        setActiveCall(null);
        setResponseModalData(null);
        setShowResponseModal(false);
        toast.success(t('booking.workerAccepted'));
      };

      on('booking:accepted', handleCallAccepted);
      
      return () => {
        off('booking:accepted', handleCallAccepted);
      };
    }
  }, [socket, connected, activeCall, on, off]);

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

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.service_category_id) params.service_category_id = filters.service_category_id;
      if (filters.availability_status) params.availability_status = filters.availability_status;
      if (filters.min_rating) params.min_rating = filters.min_rating;
      if (filters.search) params.search = filters.search;
      
      // Don't filter by availability_status by default - show all workers
      if (!filters.availability_status) {
        delete params.availability_status;
      }

      const response = await workerService.getWorkers(params);
      
      if (response && response.success) {
        // API returns { success: true, data: { workers: [...], pagination: {...} } }
        const workersData = response.data?.workers || (Array.isArray(response.data) ? response.data : []);
        const workersArray = Array.isArray(workersData) ? workersData : [];
        
        // Normalize numeric fields from database (PostgreSQL returns DECIMAL as strings)
        const normalizedWorkers = workersArray.map(worker => ({
          ...worker,
          average_rating: worker.average_rating ? parseFloat(worker.average_rating) : 0,
          hourly_rate: worker.hourly_rate ? parseFloat(worker.hourly_rate) : 0,
          experience_years: worker.experience_years ? parseInt(worker.experience_years) : 0,
          total_reviews: worker.total_reviews ? parseInt(worker.total_reviews) : 0,
          total_jobs_completed: worker.total_jobs_completed ? parseInt(worker.total_jobs_completed) : 0
        }));
        
        setWorkers(normalizedWorkers);
      } else {
        setWorkers([]);
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
      
      toast.error(t('workerSearch.failedToLoadWorkers'));
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const clearFilters = () => {
    setFilters({
      service_category_id: '',
      availability_status: '',
      min_rating: '',
      search: '',
    });
  };

  const handleWorkerClick = (workerId) => {
    navigate(`/workers/${workerId}`);
  };

  const handleInstantCallClick = () => {
    if (!filters.service_category_id) {
      toast.error(t('workerSearch.selectCategoryFirst'));
      return;
    }

    if (!isAuthenticated || user?.role !== 'user') {
      toast.info(t('workerSearch.loginAsUser'));
      navigate('/login');
      return;
    }

    setShowInstantCallModal(true);
  };

  const handleInstantCall = async (callData, images = []) => {
    setCalling(true);
    try {
      const response = await bookingService.callWorker(callData, images);
      
      if (response.success) {
        setActiveCall({
          booking_id: response.data.booking.id,
          workers_notified: response.data.workers_notified,
          timestamp: new Date(),
        });
        
        // Prepare response modal data
        setResponseModalData({
          bookingId: response.data.booking.id,
          workersNotified: response.data.workers_notified,
        });
        
        // Return response for the modal callback
        return response;
      }
    } catch (error) {
      console.error('Error calling worker:', error);
      toast.error(error.response?.data?.message || t('booking.failedToCallWorkers'));
      throw error;
    } finally {
      setCalling(false);
    }
  };

  const handleCallSuccess = (response) => {
    // Close the call modal
    setShowInstantCallModal(false);
    
    // Show the response modal
    if (response && response.success && response.data) {
      setResponseModalData({
        bookingId: response.data.booking.id,
        workersNotified: response.data.workers_notified,
      });
      setShowResponseModal(true);
    }
  };

  const getSelectedCategoryName = () => {
    const category = categories.find(cat => cat.id === filters.service_category_id);
    return category ? (category.name_en || category.name) : '';
  };

  const getAvailabilityBadge = (status) => {
    const badges = {
      available: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-300">
          <span className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></span>
          {t('worker.available')}
        </span>
      ),
      busy: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
          <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span>
          {t('worker.busy')}
        </span>
      ),
      offline: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 border border-gray-300">
          <span className="w-2 h-2 bg-gray-600 rounded-full mr-2"></span>
          {t('worker.offline')}
        </span>
      ),
    };
    return badges[status] || badges.offline;
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-olive-500">{t('workerSearch.findWorkers')}</h1>
          <p className="mt-2 text-gray-600">
            {t('workerSearch.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-olive-400">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.search')}
              </label>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder={t('workerSearch.searchPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-400 focus:border-olive-300"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('worker.serviceCategory')}
              </label>
              <select
                name="service_category_id"
                value={filters.service_category_id}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-400 focus:border-olive-300"
              >
                <option value="">{t('workerSearch.allCategories')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name_en || category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('workerSearch.availability')}
              </label>
              <select
                name="availability_status"
                value={filters.availability_status}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-400 focus:border-olive-300"
              >
                <option value="">{t('workerSearch.allWorkers')}</option>
                <option value="available">{t('workerSearch.availableNow')}</option>
                <option value="busy">{t('worker.busy')}</option>
                <option value="offline">{t('worker.offline')}</option>
              </select>
            </div>

            {/* Minimum Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('workerSearch.minimumRating')}
              </label>
              <select
                name="min_rating"
                value={filters.min_rating}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-400 focus:border-olive-300"
              >
                <option value="">{t('workerSearch.anyRating')}</option>
                <option value="4">{t('workerSearch.fourPlusStars')}</option>
                <option value="4.5">{t('workerSearch.fourHalfPlusStars')}</option>
                <option value="5">{t('workerSearch.fiveStars')}</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-orange-300 text-gray-700 rounded-lg hover:bg-orange-400 transition-colors font-medium"
            >
{t('workerSearch.clearFilters')}
            </button>
            {isAuthenticated && user?.role === 'user' && filters.service_category_id && (
              <button
                onClick={activeCall ? () => setShowResponseModal(true) : handleInstantCallClick}
                disabled={calling || !connected}
                className="px-6 py-2 bg-olive-400 text-white rounded-lg hover:bg-olive-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
              >
                {calling ? (
                  <>
                    <Loader />
                    {t('booking.callingWorkers')}
                  </>
                ) : activeCall ? (
                  <>
                    ⏳ {t('workerSearch.waitingForResponse')}
                  </>
                ) : (
                  <>
                    📞 {t('booking.callWorkers')}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Active Call Status */}
        {activeCall && !activeCall.accepted && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900">{t('workerSearch.callRequestSent')}</h3>
                <p className="text-sm text-green-700">
{t('workerSearch.requestSentToWorkers').replace('{{count}}', activeCall.workers_notified)}
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveCall(null);
                  setResponseModalData(null);
                  setShowResponseModal(false);
                  toast.info(t('workerSearch.requestCancelled'));
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
{t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow border-l-4 border-orange-400">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-olive-500 mb-2">
              {t('workerSearch.noWorkersFound')}
            </h3>
            <p className="text-gray-600">
              {t('workerSearch.tryAdjustingFilters')}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-olive-500 font-medium">
              {workers.length === 1 
                ? t('workerSearch.foundWorkers').replace('{{count}}', workers.length)
                : t('workerSearch.foundWorkers_plural').replace('{{count}}', workers.length)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.isArray(workers) && workers.map((worker) => (
                <div
                  key={worker.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 border-transparent hover:border-orange-400"
                  onClick={() => handleWorkerClick(worker.id)}
                >
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="flex-shrink-0">
                      {worker.profile_photo ? (
                        <img
                          src={worker.profile_photo}
                          alt={worker.full_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-olive-100 flex items-center justify-center">
                          <span className="text-2xl font-bold text-olive-500">
                            {worker.full_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {worker.full_name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {worker.service_category_name}
                          </p>
                        </div>
                        {worker.is_featured && (
                          <span className="px-2 py-1 text-xs font-semibold bg-orange-200 text-orange-800 rounded ml-2 flex-shrink-0">
                            ⭐
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1 text-sm font-medium">
                          {typeof worker.average_rating === 'number' ? worker.average_rating.toFixed(1) : parseFloat(worker.average_rating || 0).toFixed(1)}
                        </span>
                        <span className="ml-1 text-xs text-gray-500">
                          ({worker.total_reviews || 0})
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
{t('workerSearch.jobsCompleted').replace('{{count}}', worker.total_jobs_completed || 0)}
                      </div>
                    </div>

                    {worker.experience_years > 0 && (
                      <div className="text-sm text-gray-600">
{t('workerSearch.yearsExperience').replace('{{years}}', worker.experience_years)}
                      </div>
                    )}

                    {worker.bio && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {worker.bio}
                      </p>
                    )}

                    {worker.hourly_rate && (
                      <div className="text-lg font-semibold text-orange-500">
                        ৳{typeof worker.hourly_rate === 'number' ? worker.hourly_rate : parseFloat(worker.hourly_rate || 0)}/hour
                      </div>
                    )}

                    <div>
                      {getAvailabilityBadge(worker.availability_status)}
                    </div>

                    {worker.address && (
                      <div className="text-xs text-gray-500 flex items-center">
                        <span>📍</span>
                        <span className="ml-1 truncate">{worker.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWorkerClick(worker.id);
                      }}
                      className="w-full bg-olive-400 text-white px-4 py-2 rounded-lg hover:bg-olive-500 transition-colors text-sm font-medium"
                    >
{t('workerSearch.viewProfileAndBook')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Instant Call Modal */}
      <InstantCallModal
        isOpen={showInstantCallModal}
        onClose={() => setShowInstantCallModal(false)}
        onCall={handleInstantCall}
        onCallSuccess={handleCallSuccess}
        serviceCategoryId={filters.service_category_id}
        serviceCategoryName={getSelectedCategoryName()}
      />

      {/* Response Modal - Shows worker responses after call is made */}
      {responseModalData && (
        <InstantCallResponseModal
          isOpen={showResponseModal}
          onClose={() => {
            setShowResponseModal(false);
            // Don't clear responseModalData so user can reopen the modal by clicking the button
          }}
          bookingId={responseModalData.bookingId}
          workersNotified={responseModalData.workersNotified}
        />
      )}

      {/* Worker Accepted Modal */}
      {acceptedWorker && (
        <WorkerAcceptedModal
          isOpen={showWorkerAcceptedModal}
          onClose={() => {
            setShowWorkerAcceptedModal(false);
            setAcceptedWorker(null);
          }}
          bookingId={acceptedWorker.bookingId}
          workerId={acceptedWorker.workerId}
        />
      )}
    </div>
  );
};

export default WorkerSearch;
