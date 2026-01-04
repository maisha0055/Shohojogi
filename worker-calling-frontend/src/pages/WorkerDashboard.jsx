// WorkerDashboard.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import workerService from '../services/workerService';
import bookingService from '../services/bookingService';
import authService from '../services/authService';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import LocationPickerLeaflet from '../components/common/LocationPickerLeaflet';
import Verification from '../components/verification/Verification';
import ChangePassword from '../components/common/ChangePassword';
import { toast } from 'react-toastify';
import CallRequestModal from '../components/booking/CallRequestModal';

const WorkerDashboard = () => {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: '',
    hourly_rate: '',
    experience_years: '',
    skills: '',
    address: '',
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [availabilityChanging, setAvailabilityChanging] = useState(false);
  const [incomingCallRequests, setIncomingCallRequests] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const { socket, connected, on, off, emit } = useSocket();
  const [nidVerificationStatus, setNidVerificationStatus] = useState(null);
  const [selectedCallRequest, setSelectedCallRequest] = useState(null);
  const [showCallRequestModal, setShowCallRequestModal] = useState(false);
  const [jobAlerts, setJobAlerts] = useState([]);
  const [loadingJobAlerts, setLoadingJobAlerts] = useState(false);
  
  // Local state for availability to ensure UI updates immediately
  const [currentAvailability, setCurrentAvailability] = useState(
    user?.worker_info?.availability_status || 'offline'
  );

  const isVerified = user?.worker_info?.verification_status === 'verified';

  const [isProfileUpdating, setIsProfileUpdating] = useState(false);

  // Sync profileData with user when user changes
  useEffect(() => {
    if (user) {
      // Check both worker_profile and worker_info for compatibility
      const workerData = user.worker_profile || user.worker_info || {};
      setProfileData({
        bio: workerData.bio || '',
        hourly_rate: workerData.hourly_rate || '',
        experience_years: workerData.experience_years || '',
        skills: workerData.skills ? (Array.isArray(workerData.skills) ? workerData.skills.join(', ') : workerData.skills) : '',
        address: user.address || '',
      });
      // Set profile photo preview if user has a profile photo
      if (user.profile_photo) {
        setProfilePhotoPreview(user.profile_photo);
      }
    }
  }, [user]);

  // Fetch NID verification status
  useEffect(() => {
    const fetchNIDStatus = async () => {
      if (user && user.role === 'worker') {
        try {
          let response;
          try {
            response = await api.get('/api/verification/nid/status');
          } catch (err) {
            console.error('Error fetching NID verification status:', err);
            return; // Silently fail
          }
          if (response && response.data && response.data.success) {
            setNidVerificationStatus(response.data.data);
          }
        } catch (error) {
          console.error('Error fetching NID verification status:', error);
        }
      }
    };
    fetchNIDStatus();
  }, [user]);

  // Fetch job alerts from database (for requests that came while worker was offline)
  const fetchJobAlerts = async () => {
    if (!isVerified || currentAvailability !== 'available') return;
    
    try {
      setLoadingJobAlerts(true);
      let response;
      try {
        response = await api.get('/api/users/job-alerts?limit=20');
      } catch (err) {
        console.error('[WorkerDashboard] Error fetching job alerts:', err);
        response = { data: { success: true, data: { alerts: [] } } };
      }
      
      if (response && response.data && response.data.success) {
        const alerts = response.data.data.alerts || [];
        console.log('[WorkerDashboard] Fetched job alerts:', alerts.length);
        
        // Convert job alerts to call request format
        const callRequests = alerts
          .filter(alert => alert.reference_id) // Only alerts with booking IDs
          .map(alert => ({
            booking_id: alert.reference_id,
            service_description: alert.message || 'New service request',
            service_location: alert.message?.includes('Location:') 
              ? alert.message.split('Location:')[1]?.trim() || 'Location not specified'
              : 'Location not specified',
            received_at: new Date(alert.created_at),
            notification_id: alert.id
          }));
        
        console.log('[WorkerDashboard] Converted to call requests:', callRequests.length);
        
        // Merge with socket-based requests (avoid duplicates)
        setIncomingCallRequests(prev => {
          const existingIds = new Set(prev.map(r => r.booking_id));
          const newRequests = callRequests.filter(r => !existingIds.has(r.booking_id));
          console.log('[WorkerDashboard] Adding new requests:', newRequests.length);
          return [...prev, ...newRequests];
        });
      }
    } catch (error) {
      console.error('[WorkerDashboard] Error fetching job alerts:', error);
    } finally {
      setLoadingJobAlerts(false);
    }
  };

  useEffect(() => {
    // Skip all checks if we're in the middle of updating profile
    if (isProfileUpdating) {
      return;
    }
    
    // Only check for onboarding once on mount
    if (user && user.role === 'worker') {
      const hasCategory = user?.worker_info?.service_category_id || user?.worker_profile?.service_category_id;
      
      // Only redirect if worker hasn't completed onboarding (no category set)
      if (!hasCategory) {
        navigate('/worker-onboarding');
        return;
      }
    }
    
    fetchDashboardData();
    fetchCategories();
    if (isVerified && currentAvailability === 'available') {
      fetchAvailableSlots();
      // Fetch job alerts on mount (for requests that came while offline)
      setTimeout(() => {
        fetchJobAlerts();
      }, 500); // Small delay to ensure user data is loaded
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Socket listeners for real-time call requests
  useEffect(() => {
    if (socket && connected && isVerified && currentAvailability === 'available') {
      const handleCallRequest = (data) => {
        console.log('[WorkerDashboard] 🔔 Received worker:call-request socket event:', {
          booking_id: data.booking_id,
          booking_number: data.booking_number,
          service_description: data.service_description,
          service_location: data.service_location,
          image_count: data.image_urls?.length || 0,
          user: data.user,
          type: data.type
        });
        
        // Check if this is a call_worker request (not scheduled slot)
        if (!data.type || data.type !== 'scheduled_slot') {
          setIncomingCallRequests(prev => {
            // Avoid duplicates
            if (prev.find(req => req.booking_id === data.booking_id)) {
              console.log('[WorkerDashboard] Request already in list, skipping');
              return prev;
            }
            console.log('[WorkerDashboard] Adding new request with full details:', data);
            console.log('[WorkerDashboard] Current list length before:', prev.length);
            
            // Store all data including user info, images, location, description
            const newRequest = { 
              booking_id: data.booking_id,
              booking_number: data.booking_number,
              service_description: data.service_description,
              service_location: data.service_location,
              service_category: data.service_category,
              image_urls: data.image_urls || [],
              location_latitude: data.location_latitude,
              location_longitude: data.location_longitude,
              user: data.user || null,
              created_at: data.created_at,
              received_at: new Date() 
            };
            
            console.log('[WorkerDashboard] New request object:', newRequest);
            const updated = [newRequest, ...prev];
            console.log('[WorkerDashboard] Updated list length:', updated.length);
            return updated;
          });
          
          // Show notification with more details
          const imageText = data.image_urls?.length > 0 ? ` (${data.image_urls.length} image${data.image_urls.length > 1 ? 's' : ''})` : '';
          const userText = data.user?.full_name ? ` from ${data.user.full_name}` : '';
          toast.info(`${t('worker.newCallRequest')}${userText}: ${data.service_description || t('worker.serviceRequest')}${imageText}`, {
            onClick: () => {
              // Scroll to requests section
              document.getElementById('incoming-requests')?.scrollIntoView({ behavior: 'smooth' });
            }
          });
        }
      };

      const handleCallRequestAccepted = (data) => {
        // Remove the request from the list if it was accepted by another worker
        if (data.accepted_by !== user?.id) {
          setIncomingCallRequests(prev => prev.filter(req => req.booking_id !== data.booking_id));
          toast.info(t('worker.anotherWorkerAccepted'));
        }
      };

      const handleCallRequestClosed = (data) => {
        // Remove the request from the list if it was closed (user selected another worker)
        setIncomingCallRequests(prev => prev.filter(req => req.booking_id !== data.booking_id));
        toast.info(data.message || t('worker.requestAssignedToAnotherWorker'));
      };

      const handleScheduledSlot = (data) => {
        if (data.type === 'scheduled_slot') {
          fetchAvailableSlots(); // Refresh slots
          toast.info(`New scheduled slot available: ${data.scheduled_date} at ${data.scheduled_time}`);
        }
      };

      on('worker:call-request', handleCallRequest);
      on('worker:call-request', handleScheduledSlot);
      on('worker:call-request-accepted', handleCallRequestAccepted);
      on('worker:call-request-closed', handleCallRequestClosed);

      // Notify server about availability update when availability changes
      const notifyAvailability = () => {
        if (user?.worker_info?.service_category_id && emit && connected) {
          console.log('[WorkerDashboard] 📡 Emitting availability update:', {
            availability_status: currentAvailability,
            service_category_id: user.worker_info.service_category_id,
            worker_id: user?.id,
            verified: isVerified
          });
          emit('worker:availability-update', {
            availability_status: currentAvailability,
            service_category_id: user.worker_info.service_category_id
          });
        } else {
          console.warn('[WorkerDashboard] ⚠️ Cannot emit availability update:', {
            hasCategory: !!user?.worker_info?.service_category_id,
            hasEmit: !!emit,
            isConnected: connected,
            availability: currentAvailability,
            isVerified: isVerified
          });
        }
      };

      // Listen for connection confirmation from server
      const handleWorkerConnected = (data) => {
        console.log('[WorkerDashboard] ✅ Server confirmed worker connection:', data);
        // Re-emit availability update after server confirms connection
        setTimeout(() => {
          notifyAvailability();
        }, 200);
      };
      
      on('worker:connected', handleWorkerConnected);
      
      // Notify on mount and when availability changes
      // Add a small delay to ensure socket is fully connected
      setTimeout(() => {
        notifyAvailability();
      }, 500);
      
      // Fetch job alerts when socket connects (for requests that came while offline)
      console.log('[WorkerDashboard] Socket connected, fetching job alerts...');
      fetchJobAlerts();
      
      // Set up periodic refresh of job alerts (every 30 seconds)
      const jobAlertsInterval = setInterval(() => {
        fetchJobAlerts();
      }, 30000);

      return () => {
        off('worker:call-request', handleCallRequest);
        off('worker:call-request', handleScheduledSlot);
        off('worker:call-request-accepted', handleCallRequestAccepted);
        off('worker:call-request-closed', handleCallRequestClosed);
        off('worker:connected', handleWorkerConnected);
        clearInterval(jobAlertsInterval);
      };
    }
  }, [socket, connected, isVerified, currentAvailability, user?.worker_info?.service_category_id, on, off, emit, fetchJobAlerts]);

  const fetchAvailableSlots = async () => {
    try {
      const categoryId = user?.worker_info?.service_category_id;
      if (!categoryId) {
        setAvailableSlots([]);
        return;
      }
      
      let response;
      try {
        response = await api.get(`/api/bookings/available-slots?category_id=${categoryId}`);
      } catch (err) {
        console.error('Error fetching available slots:', err);
        response = { data: { success: true, data: [] } };
      }
      
      if (response && response.data && response.data.success) {
        setAvailableSlots(response.data.data || []);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
    }
  };

  const handleViewCallRequest = (request) => {
    setSelectedCallRequest(request.booking_id);
    setShowCallRequestModal(true);
    
    // Mark job alert as read if it came from database
    if (request.notification_id) {
      api.put(`/api/users/job-alerts/${request.notification_id}/read`).catch(() => {});
    }
  };

  const handleCallRequestModalClose = () => {
    setShowCallRequestModal(false);
    setSelectedCallRequest(null);
  };

  const handleEstimateSubmitted = () => {
    // Remove from incoming requests after estimate is submitted
    if (selectedCallRequest) {
      setIncomingCallRequests(prev => prev.filter(req => req.booking_id !== selectedCallRequest));
    }
    setShowCallRequestModal(false);
    setSelectedCallRequest(null);
  };

  const handleAcceptCallRequest = async (bookingId) => {
    // This is for old-style instant accept (not used in new bidding system)
    // For new bidding system, use handleViewCallRequest instead
    try {
      const response = await bookingService.acceptCallRequest(bookingId);
      if (response.success) {
        setIncomingCallRequests(prev => prev.filter(req => req.booking_id !== bookingId));
        toast.success(t('worker.callRequestAccepted'));
        fetchDashboardData(); // Refresh dashboard
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('worker.failedToAccept'));
    }
  };

  const handleAcceptSlot = async (slotId) => {
    try {
      const response = await bookingService.acceptScheduledSlot(slotId);
      if (response.success) {
        toast.success(t('worker.scheduledSlotAccepted'));
        fetchAvailableSlots(); // Refresh slots
        fetchDashboardData(); // Refresh dashboard
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('worker.failedToAcceptSlot'));
    }
  };

  // Update local availability when user data changes
  useEffect(() => {
    if (user?.worker_info?.availability_status) {
      setCurrentAvailability(user.worker_info.availability_status);
    }
  }, [user?.worker_info?.availability_status]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats - errors are handled silently by API interceptor
      let statsResponse;
      try {
        statsResponse = await api.get('/api/workers/stats/me');
      } catch (err) {
        console.error('Error fetching worker stats:', err);
        statsResponse = { data: { success: true, data: {
          total_jobs_completed: 0,
          average_rating: 0,
          total_reviews: 0,
          pending_bookings: 0,
          active_bookings: 0,
          jobs_this_month: 0,
          total_earnings: 0
        }}};
      }

      // Fetch bookings - errors are handled silently by API interceptor
      let bookingsResponse;
      try {
        bookingsResponse = await api.get('/api/bookings/worker-bookings?limit=5');
      } catch (err) {
        console.error('Error fetching worker bookings:', err);
        bookingsResponse = { data: { success: true, data: [] }};
      }

      if (statsResponse && statsResponse.data && statsResponse.data.success) {
        setStats(statsResponse.data.data);
      } else {
        // Set default stats if API call failed
        setStats({
          total_jobs_completed: 0,
          average_rating: 0,
          total_reviews: 0,
          pending_bookings: 0,
          active_bookings: 0,
          jobs_this_month: 0,
          total_earnings: 0
        });
      }

      if (bookingsResponse && bookingsResponse.data && bookingsResponse.data.success) {
        setRecentBookings(bookingsResponse.data.data || []);
      } else {
        setRecentBookings([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Don't show error toast, just set default values
      setStats({
        total_jobs_completed: 0,
        average_rating: 0,
        total_reviews: 0,
        pending_bookings: 0,
        active_bookings: 0,
        jobs_this_month: 0,
        total_earnings: 0
      });
      setRecentBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      let response;
      try {
        response = await api.get('/api/categories');
      } catch (err) {
        console.error('Error fetching categories:', err);
        response = { data: { success: true, data: [] } };
      }
      if (response && response.data && response.data.success) {
        setCategories(response.data.data || []);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const handleAvailabilityToggle = async () => {
    // Determine new status - simple toggle between available and offline
    const newStatus = currentAvailability === 'available' ? 'offline' : 'available';
    
    try {
      setAvailabilityChanging(true);
      
      // Optimistically update UI
      setCurrentAvailability(newStatus);
      
      const response = await workerService.updateAvailability(newStatus);
      
      if (response.success) {
        // Update user context
        const updatedUser = { ...user };
        if (!updatedUser.worker_info) {
          updatedUser.worker_info = {};
        }
        updatedUser.worker_info.availability_status = newStatus;
        updateUser(updatedUser);
        
        // Notify socket server about availability change
        if (emit && user?.worker_info?.service_category_id) {
          emit('worker:availability-update', {
            availability_status: newStatus,
            service_category_id: user.worker_info.service_category_id
          });
        }
        
        const statusText = newStatus === 'available' ? t('worker.availableForWork') : t('worker.notAvailable');
        toast.success(`${t('worker.youAreNow')} ${statusText}`);
      } else {
        // Revert on failure
        setCurrentAvailability(currentAvailability === 'available' ? 'offline' : 'available');
        toast.error(t('worker.failedToUpdateAvailability'));
      }
    } catch (error) {
      // Revert on error
      setCurrentAvailability(currentAvailability === 'available' ? 'offline' : 'available');
      console.error('Availability update error:', error);
      toast.error(error.response?.data?.message || t('worker.failedToUpdateAvailability'));
    } finally {
      setAvailabilityChanging(false);
    }
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('worker.pleaseSelectImageFile'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('worker.imageSizeMustBeLessThan5MB'));
      return;
    }

    setProfilePhoto(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsProfileUpdating(true);
    
    try {
      const formData = new FormData();
      formData.append('bio', profileData.bio || '');
      formData.append('hourly_rate', profileData.hourly_rate || '');
      formData.append('experience_years', profileData.experience_years || '');
      // Skills should be sent as JSON array string for FormData
      const skillsArray = profileData.skills ? profileData.skills.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
      formData.append('skills', JSON.stringify(skillsArray));
      formData.append('address', profileData.address || '');
      
      // Add profile photo if selected
      if (profilePhoto) {
        formData.append('profile_photo', profilePhoto);
      }

      const response = await workerService.updateWorkerProfile(formData);
      
      if (response.success) {
        // Fetch fresh user data to ensure proper structure
        try {
          const currentUserResponse = await authService.getCurrentUser();
          if (currentUserResponse.success) {
            updateUser(currentUserResponse.data);
          } else {
            // Fallback: update with response data
            updateUser(response.data);
          }
        } catch (err) {
          console.error('Error fetching updated user:', err);
          // Fallback: update with response data
          updateUser(response.data);
        }
        
        // Close edit mode
        setEditMode(false);
        setProfilePhoto(null);
        // Reset preview to updated profile photo
        if (response.data?.profile_photo) {
          setProfilePhotoPreview(response.data.profile_photo);
        } else if (response.data?.data?.profile_photo) {
          setProfilePhotoPreview(response.data.data.profile_photo);
        }
        toast.success(t('worker.profileUpdated'));
        // Refresh dashboard data
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || t('worker.failedToUpdateProfile'));
    } finally {
      // Reset flag immediately
      setIsProfileUpdating(false);
    }
  };

  // NID verification is now handled by the NIDVerification component

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getAvailabilityBadge = (status) => {
    const badges = {
      available: (
        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800 border-2 border-green-300">
          <span className="w-3 h-3 bg-green-600 rounded-full mr-2 animate-pulse"></span>
          {t('worker.available')}
        </span>
      ),
      busy: (
        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border-2 border-yellow-300">
          <span className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></span>
          {t('worker.busy')}
        </span>
      ),
      offline: (
        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 border-2 border-gray-300">
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

  return (
    <>
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {profilePhotoPreview && (
                <div className="flex-shrink-0">
                  <img
                    src={profilePhotoPreview}
                    alt="Profile"
                    className="h-16 w-16 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('worker.workerDashboard')}</h1>
                <p className="mt-2 text-gray-600">{t('worker.welcomeBack')}, {user?.full_name}!</p>
              </div>
            </div>
            {nidVerificationStatus?.verification_status === 'approved' && (
              <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-800 font-semibold">{t('worker.nidVerified')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Verification Alert */}
        {user?.worker_info?.verification_status === 'pending' && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {t('worker.profileUnderVerification')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* NID Verification Status - Now handled by NIDVerification component in sidebar */}

        {/* Availability Toggle - SIMPLE & EASY */}
        <div className="mb-6 card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('worker.availabilityStatus')}</h3>
              <p className="text-sm text-gray-600">
                {t('worker.availabilityDescription')}
              </p>
              {/* Current Status Badge */}
              <div className="mt-3">
                {getAvailabilityBadge(currentAvailability)}
              </div>
            </div>
            
            {/* Toggle Switch */}
            <div className="flex flex-col items-center ml-6">
              <button
                onClick={handleAvailabilityToggle}
                disabled={availabilityChanging}
                className={`relative inline-flex h-14 w-28 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  currentAvailability === 'available'
                    ? 'bg-green-600 focus:ring-green-500'
                    : 'bg-gray-400 focus:ring-gray-500'
                } ${availabilityChanging ? 'opacity-60 cursor-wait' : 'hover:shadow-lg cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-12 w-12 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                    currentAvailability === 'available'
                      ? 'translate-x-14'
                      : 'translate-x-1'
                  }`}
                >
                  {availabilityChanging && (
                    <span className="flex items-center justify-center h-full">
                      <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  )}
                </span>
                <span className={`absolute text-xs font-bold transition-opacity ${
                  currentAvailability === 'available' ? 'left-3 text-white' : 'right-3 text-white'
                }`}>
                  {currentAvailability === 'available' ? 'ON' : 'OFF'}
                </span>
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                {currentAvailability === 'available' ? t('worker.acceptingJobs') : t('worker.notAcceptingJobs')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">{t('worker.pendingRequests')}</div>
            <div className="text-3xl font-bold text-yellow-600">
              {stats?.pending_bookings || 0}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">{t('worker.activeJobs')}</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.active_bookings || 0}
            </div>
          </div>
          <div className="card">
                    <div className="text-sm text-gray-600 mb-1">{t('worker.completedJobs')}</div>
            <div className="text-3xl font-bold text-green-600">
              {stats?.total_jobs_completed || 0}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">{t('worker.totalEarnings')}</div>
            <div className="text-3xl font-bold text-primary-600">
              ৳{stats?.total_earnings?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        {/* Rating Card */}
        <div className="card mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('worker.yourRating')}</h3>
              <div className="flex items-center mt-2">
                <span className="text-3xl font-bold text-yellow-600">
                  {user?.worker_info?.average_rating?.toFixed(1) || '0.0'}
                </span>
                <span className="ml-2 text-2xl text-yellow-400">★</span>
                <span className="ml-2 text-gray-600">
                  ({user?.worker_info?.total_reviews || 0} {t('worker.reviews')})
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">{t('worker.thisMonth')}</div>
              <div className="text-2xl font-bold text-primary-600">
                {stats?.jobs_this_month || 0}
              </div>
              <div className="text-xs text-gray-500">{t('worker.jobsCompleted')}</div>
            </div>
          </div>
        </div>

        {/* Verification and Profile Section - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Left Side - Verification Component */}
          <div className="lg:col-span-7 space-y-6">
            {/* Account Activation Status */}
            {user && !user.is_active && nidVerificationStatus?.verification_status !== 'approved' && (
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-l-4 border-amber-400 rounded-lg shadow-sm p-5">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full">
                      <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 mb-2 tracking-tight">{t('worker.accountUnverified')}</h3>
                    <div className="space-y-2">
                      <p className="text-sm leading-relaxed text-gray-700">
                        {t('worker.accountUnverifiedDesc')} <span className="font-semibold text-gray-900">{t('worker.nidAndSelfieVerification')}</span> {t('worker.andWaitForApproval')}
                      </p>
                      <p className="text-sm leading-relaxed text-gray-700">
                        {t('worker.canAccessPremium')} <span className="font-semibold text-amber-700">{t('worker.premiumFeatures')}</span> {t('worker.afterVerifying')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {user && user.is_active && (
              <div className="card bg-green-50 border-green-200">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-green-900">{t('worker.accountActive')}</h3>
                    <p className="text-xs text-green-700">{t('worker.accountActiveDesc')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Component */}
            <Verification />
          </div>

          {/* Right Side - Profile and Quick Actions */}
          <div className="lg:col-span-5 space-y-6">
            {/* Profile Card */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{t('common.profile')}</h2>
                {!editMode && (
                  <button
                    onClick={() => {
                      const workerData = user?.worker_profile || user?.worker_info || {};
                      setProfileData({
                        bio: workerData.bio || '',
                        hourly_rate: workerData.hourly_rate || '',
                        experience_years: workerData.experience_years || '',
                        skills: workerData.skills ? (Array.isArray(workerData.skills) ? workerData.skills.join(', ') : workerData.skills) : '',
                        address: user?.address || '',
                      });
                      setEditMode(true);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {t('common.edit')}
                  </button>
                )}
              </div>

              {editMode ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  {/* Profile Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('worker.profilePhoto')}
                    </label>
                    <div className="flex items-center space-x-4">
                      {profilePhotoPreview && (
                        <div className="flex-shrink-0">
                          <img
                            src={profilePhotoPreview}
                            alt="Profile preview"
                            className="h-20 w-20 rounded-full object-cover border-2 border-gray-300"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePhotoChange}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          {t('worker.imageFormatHint')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('worker.bio')}
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      rows={3}
                      className="input-field"
                      placeholder="Tell clients about yourself..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('worker.hourlyRate')} (৳)
                    </label>
                    <input
                      type="number"
                      value={profileData.hourly_rate}
                      onChange={(e) => setProfileData({ ...profileData, hourly_rate: e.target.value })}
                      className="input-field"
                      placeholder="500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('worker.experienceYears')}
                    </label>
                    <input
                      type="number"
                      value={profileData.experience_years}
                      onChange={(e) => setProfileData({ ...profileData, experience_years: e.target.value })}
                      className="input-field"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('worker.skills')} ({t('worker.commaSeparated')})
                    </label>
                    <input
                      type="text"
                      value={profileData.skills}
                      onChange={(e) => setProfileData({ ...profileData, skills: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Plumbing, Electrical, Carpentry"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.address')}
                    </label>
                    <input
                      type="text"
                      value={profileData.address}
                      onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                      className="input-field"
                      placeholder="Your address"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={isProfileUpdating}
                      className="btn-primary flex-1"
                    >
                      {isProfileUpdating ? t('common.loading') : t('user.saveChanges')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditMode(false);
                        if (user) {
                          const workerData = user.worker_profile || user.worker_info || {};
                          setProfileData({
                            bio: workerData.bio || '',
                            hourly_rate: workerData.hourly_rate || '',
                            experience_years: workerData.experience_years || '',
                            skills: workerData.skills ? (Array.isArray(workerData.skills) ? workerData.skills.join(', ') : workerData.skills) : '',
                            address: user.address || '',
                          });
                          if (user.profile_photo) {
                            setProfilePhotoPreview(user.profile_photo);
                          } else {
                            setProfilePhotoPreview(null);
                          }
                        }
                      }}
                      className="btn-secondary flex-1"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  {/* Profile Photo Display */}
                  {profilePhotoPreview && (
                    <div className="flex justify-center mb-4">
                      <img
                        src={profilePhotoPreview}
                        alt="Profile"
                        className="h-24 w-24 rounded-full object-cover border-4 border-gray-200 shadow-md"
                      />
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">{t('auth.fullName')}</div>
                    <div className="text-sm font-medium break-words">{user?.full_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">{t('auth.email')}</div>
                    <div className="text-sm font-medium break-all">{user?.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">{t('auth.phone')}</div>
                    <div className="text-sm font-medium">{user?.phone}</div>
                  </div>
                  {user?.address && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">{t('auth.address')}</div>
                      <div className="text-sm font-medium break-words">{user?.address}</div>
                    </div>
                  )}
                  {(() => {
                    const workerData = user?.worker_profile || user?.worker_info || {};
                    return (
                      <>
                        {workerData.bio && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">{t('worker.bio')}</div>
                            <div className="text-sm font-medium break-words whitespace-pre-wrap max-w-full overflow-hidden">{workerData.bio}</div>
                          </div>
                        )}
                        {workerData.hourly_rate && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">{t('worker.hourlyRate')}</div>
                            <div className="text-sm font-medium">৳{workerData.hourly_rate}</div>
                          </div>
                        )}
                        {workerData.experience_years > 0 && (
                          <div>
                    <div className="text-xs text-gray-500 mb-1">{t('worker.experience')}</div>
                    <div className="text-sm font-medium">{workerData.experience_years} {t('worker.years')}</div>
                          </div>
                        )}
                        {workerData.skills && (Array.isArray(workerData.skills) ? workerData.skills.length > 0 : workerData.skills) && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">{t('worker.skills')}</div>
                            <div className="text-sm font-medium break-words max-w-full overflow-hidden">
                              {Array.isArray(workerData.skills) ? workerData.skills.join(', ') : workerData.skills}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('worker.quickActions')}</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/bookings')}
                  className="block w-full btn-primary text-center"
                >
                  {t('worker.viewAllJobs')}
                </button>
                <button
                  onClick={() => navigate('/worker-slots')}
                  className="block w-full btn-primary text-center"
                >
                  📅 {t('worker.yourSlots')}
                </button>
                <button
                  onClick={() => navigate('/chat')}
                  className="block w-full btn-secondary text-center"
                >
                  {t('common.messages')}
                </button>
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="block w-full btn-secondary text-center"
                >
                  🔒 {t('worker.changePassword')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Below Verification and Profile */}
        <div className="space-y-6">
          {/* Incoming Call Requests */}
          {isVerified && currentAvailability === 'available' && (
              <div id="incoming-requests" className="card border-2 border-primary-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-gray-900">📞 {t('worker.incomingCallRequests')}</h2>
                    {incomingCallRequests.length > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 animate-pulse">
                        {incomingCallRequests.length}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      console.log('[WorkerDashboard] Current incomingCallRequests state:', incomingCallRequests);
                      console.log('[WorkerDashboard] State length:', incomingCallRequests.length);
                      fetchJobAlerts();
                    }} 
                    disabled={loadingJobAlerts}
                    className="btn-secondary btn-sm"
                  >
                    {loadingJobAlerts ? t('common.loading') : `🔄 ${t('common.refresh')}`}
                  </button>
                </div>
                
                {/* Debug info in development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
                    <p>Debug: incomingCallRequests.length = {incomingCallRequests.length}</p>
                    <p>isVerified = {String(isVerified)}, availability = {currentAvailability}</p>
                    {incomingCallRequests.length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer">View first request data</summary>
                        <pre className="mt-1 text-xs overflow-auto">
                          {JSON.stringify(incomingCallRequests[0], null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                {loadingJobAlerts ? (
                  <div className="text-center py-4">
                    <Loader />
                    <p className="text-gray-500 text-sm mt-2">Loading job alerts...</p>
                  </div>
                ) : incomingCallRequests.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">{t('worker.noIncomingRequests')}</p>
                    <button
                      onClick={fetchJobAlerts}
                      className="mt-2 text-sm text-primary-600 hover:text-primary-700 underline"
                    >
                      🔄 {t('worker.refreshJobAlerts')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incomingCallRequests.map((request) => (
                      <div
                        key={request.booking_id}
                        className="border-2 border-primary-300 rounded-lg p-4 bg-primary-50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {request.user?.profile_photo ? (
                                <img
                                  src={request.user.profile_photo}
                                  alt={request.user.full_name}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary-200 flex items-center justify-center">
                                  <span className="text-primary-700 font-bold">
                                    {request.user?.full_name?.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {request.user?.full_name || 'User'}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  {request.service_category || t('worker.serviceRequest')}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 mt-2">
                              {request.service_description || t('worker.noDescriptionProvided')}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600 flex-wrap gap-2">
                              <span>📍 {request.service_location || t('worker.locationNotSpecified')}</span>
                              {request.image_urls && request.image_urls.length > 0 && (
                                <span className="text-primary-600 font-medium">
                                  📸 {request.image_urls.length} image{request.image_urls.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {request.estimated_price && (
                                <span className="font-semibold text-primary-600">
                                  ৳{request.estimated_price}
                                </span>
                              )}
                            </div>
                            {request.received_at && (
                              <p className="text-xs text-gray-500 mt-1">
                                {t('worker.received')}: {new Date(request.received_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => handleViewCallRequest(request)}
                              className="btn-primary whitespace-nowrap"
                            >
                              💰 {t('worker.viewAndSubmitEstimate')}
                            </button>
                            <button
                              onClick={() => {
                                // Reject functionality - remove from list
                                setIncomingCallRequests(prev => 
                                  prev.filter(req => req.booking_id !== request.booking_id)
                                );
                                toast.info(t('worker.requestIgnored'));
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 whitespace-nowrap text-sm"
                            >
                              ✕ {t('worker.ignore')}
                            </button>
                          </div>
                        </div>
                        {/* Map showing user location */}
                        {request.location_latitude && request.location_longitude && (
                          <div className="mt-3 border border-gray-300 rounded-lg overflow-hidden">
                            <LocationPickerLeaflet
                              initialLocation={{
                                lat: parseFloat(request.location_latitude),
                                lng: parseFloat(request.location_longitude)
                              }}
                              height="200px"
                              readOnly={true}
                              onLocationSelect={() => {}}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Available Scheduled Slots */}
            {isVerified && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">📅 {t('worker.availableScheduledSlots')}</h2>
                  <button
                    onClick={fetchAvailableSlots}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    {t('common.refresh')}
                  </button>
                </div>

                {availableSlots.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">{t('worker.noAvailableSlots')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {slot.user?.profile_photo ? (
                                <img
                                  src={slot.user.profile_photo}
                                  alt={slot.user.full_name}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-gray-700 font-bold">
                                    {slot.user?.full_name?.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {slot.user?.full_name}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  📅 {slot.scheduled_date} at {slot.scheduled_time}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 mt-2">{slot.service_description}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600">
                              <span>📍 {slot.service_location}</span>
                              {slot.estimated_price && (
                                <span className="font-semibold">৳{slot.estimated_price}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleAcceptSlot(slot.id)}
                            className="btn-primary ml-4 whitespace-nowrap"
                          >
                            {t('worker.accept')} Slot
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recent Bookings */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{t('worker.recentJobRequests')}</h2>
                <button
                  onClick={() => navigate('/bookings')}
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  {t('user.viewAll')}
                </button>
              </div>

              {recentBookings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📋</div>
                  <p className="text-gray-600">{t('worker.noRecentBookings')}</p>
                  {!isVerified && (
                    <p className="text-sm text-gray-500 mt-2">
                      {t('worker.completeVerificationToReceive')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors cursor-pointer"
                      onClick={() => navigate('/bookings')}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">
                              {booking.user?.full_name}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                              {(() => {
                                const statusKey = `booking.${booking.status}`;
                                const translated = t(statusKey);
                                return translated === statusKey 
                                  ? booking.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                  : translated;
                              })()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {booking.service_description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>📍 {booking.service_location}</span>
                            {booking.estimated_price && (
                              <span className="font-semibold">৳{booking.estimated_price}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        title={t('worker.changePassword')}
      >
        <ChangePassword onClose={() => setShowChangePasswordModal(false)} />
      </Modal>

      {/* Call Request Modal for Estimate Submission */}
      {showCallRequestModal && selectedCallRequest && (
        <CallRequestModal
          isOpen={showCallRequestModal}
          onClose={handleCallRequestModalClose}
          bookingId={selectedCallRequest}
          onAccepted={handleEstimateSubmitted}
        />
      )}

    </>
  );
};

export default WorkerDashboard;