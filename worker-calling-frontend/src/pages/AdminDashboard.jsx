import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import ChangePassword from '../components/common/ChangePassword';
import BlogManagement from '../components/admin/BlogManagement';
import CategoryManagement from '../components/admin/CategoryManagement';
import ProductManagement from '../components/admin/ProductManagement';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [nidVerifications, setNIDVerifications] = useState([]);
  const [selectedNIDVerification, setSelectedNIDVerification] = useState(null);
  const [showNIDVerificationModal, setShowNIDVerificationModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const previousPendingCountRef = useRef(0);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'overview') {
        const response = await api.get('/api/admin/stats');
        if (response.data.success) {
          setStats(response.data.data);
        }
      } else if (activeTab === 'users') {
        const response = await api.get('/api/admin/users');
        if (response.data.success) {
          setUsers(response.data.data);
        }
      } else if (activeTab === 'reports') {
        const response = await api.get('/api/admin/reports');
        if (response.data.success) {
          setReports(response.data.data);
        }
      } else if (activeTab === 'nid-verifications') {
        // Fetch all unreviewed verifications (pending, approved, and auto_rejected that need admin review)
        const response = await api.get('/api/admin/nid-verifications/pending');
        if (response.data.success) {
          setNIDVerifications(response.data.data || []);
        }
      } else if (activeTab === 'blogs') {
        // Blog data is fetched by BlogManagement component
        setLoading(false);
      } else if (activeTab === 'categories') {
        // Category data is fetched by CategoryManagement component
        setLoading(false);
      } else if (activeTab === 'products') {
        // Product data is fetched by ProductManagement component
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error(t('admin.failedToLoadDashboard'));
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Initialize previous count when stats are first loaded
  useEffect(() => {
    if (stats?.pending_verifications !== undefined) {
      previousPendingCountRef.current = parseInt(stats.pending_verifications) || 0;
    }
  }, [stats?.pending_verifications]);

  // Poll for pending verifications updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      api.get('/api/admin/stats')
        .then(response => {
          if (response.data.success) {
            const newPendingCount = parseInt(response.data.data?.pending_verifications) || 0;
            const currentPendingCount = previousPendingCountRef.current;
            
            // Update stats immediately
            setStats(response.data.data);
            
            // Show notification if new verification request comes in
            if (newPendingCount > currentPendingCount && currentPendingCount >= 0) {
              const newRequests = newPendingCount - currentPendingCount;
              toast.info(
                <div>
                  <p className="font-semibold text-base">🔔 New NID Verification Request!</p>
                  <p className="text-sm mt-1">
                    {newRequests === 1 
                      ? '1 new verification pending review' 
                      : `${newRequests} new verifications pending review`}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Total pending: {newPendingCount}</p>
                  <button
                    onClick={() => {
                      setActiveTab('nid-verifications');
                      toast.dismiss();
                    }}
                    className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Review Now →
                  </button>
                </div>,
                {
                  autoClose: 10000,
                  position: 'top-right',
                  style: { cursor: 'pointer' },
                  onClick: () => {
                    setActiveTab('nid-verifications');
                    toast.dismiss();
                  }
                }
              );
            }
            
            // Update previous count for next comparison
            previousPendingCountRef.current = newPendingCount;
          }
        })
        .catch(error => {
          console.error('Error polling stats:', error);
        });
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, []); // Empty dependency array - runs once on mount


  const handleToggleUserStatus = async (userId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    const confirmMessage = currentStatus ? t('admin.confirmDeactivate') : t('admin.confirmActivate');
    if (!window.confirm(confirmMessage)) return;
    
    try {
      const response = await api.put(`/api/admin/users/${userId}/${action}`);
      if (response.data.success) {
        toast.success(currentStatus ? t('admin.userDeactivated') : t('admin.userActivated'));
        fetchDashboardData();
      }
    } catch (error) {
      toast.error(currentStatus ? t('admin.failedToDeactivate') : t('admin.failedToActivate'));
    }
  };

  const handleToggleFeaturedWorker = async (workerId, currentStatus) => {
    try {
      const response = await api.put(`/api/admin/workers/${workerId}/feature`);
      if (response.data.success) {
        toast.success(currentStatus ? t('admin.workerUnfeatured') : t('admin.workerFeatured'));
        fetchDashboardData();
      }
    } catch (error) {
      toast.error(t('admin.failedToUpdateFeatured'));
    }
  };

  const handleUpdateReportStatus = async (reportId, status) => {
    try {
      const response = await api.put(`/api/admin/reports/${reportId}`, { status });
      if (response.data.success) {
        toast.success(t('admin.reportStatusUpdated'));
        fetchDashboardData();
      }
    } catch (error) {
      toast.error(t('admin.failedToUpdateReport'));
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">{t('admin.totalUsers')}</div>
          <div className="text-3xl font-bold text-primary-600">
            {stats?.total_users || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">{t('admin.totalWorkers')}</div>
          <div className="text-3xl font-bold text-blue-600">
            {stats?.total_workers || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">{t('admin.totalBookings')}</div>
          <div className="text-3xl font-bold text-green-600">
            {stats?.total_bookings || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">{t('admin.platformRevenue')}</div>
          <div className="text-3xl font-bold text-yellow-600">
            ৳{stats?.total_revenue?.toLocaleString() || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card relative">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            {t('admin.pendingVerifications')}
            {stats?.pending_verifications > 0 && (
              <span className="ml-2 px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                {stats.pending_verifications}
              </span>
            )}
          </h3>
          <div className="mb-2">
            <div className="text-4xl font-bold text-yellow-600">
              {stats?.pending_verifications || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {stats?.pending_verifications === 1 
                ? t('admin.pendingRequest')
                : stats?.pending_verifications > 1 
                  ? t('admin.pendingRequests')
                  : t('admin.noPendingRequests')}
            </div>
          </div>
          <button
            onClick={() => setActiveTab('nid-verifications')}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {t('admin.reviewNow')}
          </button>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold mb-4">{t('admin.openReports')}</h3>
          <div className="text-4xl font-bold text-red-600 mb-2">
            {stats?.open_reports || 0}
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {t('admin.viewReports')}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold mb-4">{t('admin.recentActivity')}</h3>
        <div className="space-y-3">
          {stats?.recent_bookings?.slice(0, 5).map((booking) => (
            <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {booking.user_name} → {booking.worker_name}
                </p>
                <p className="text-xs text-gray-600">{booking.service_description}</p>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(booking.created_at).toLocaleDateString()}
              </span>
            </div>
          )) || (
            <p className="text-gray-500 text-sm">{t('admin.noRecentActivity')}</p>
          )}
        </div>
      </div>
    </div>
  );


  const renderUsers = () => (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">{t('admin.users')}</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.name')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.role')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.joined')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {user.profile_photo ? (
                        <img className="h-10 w-10 rounded-full" src={user.profile_photo} alt="" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary-600">
                            {user.full_name?.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'worker' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? t('admin.active') : t('admin.inactive')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  {user.role === 'worker' && (
                    <button
                      onClick={() => handleToggleFeaturedWorker(user.id, user.is_featured)}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      {user.is_featured ? `⭐ ${t('admin.unfeature')}` : `☆ ${t('admin.feature')}`}
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                    className={user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                  >
                    {user.is_active ? t('admin.deactivate') : t('admin.activate')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const handleApproveNIDVerification = async (verificationId) => {
    if (!window.confirm('Are you sure you want to approve this NID verification? This will mark it as approved, but you still need to activate the worker account separately if needed.')) return;
    
    try {
      const response = await api.put(`/api/admin/nid-verifications/${verificationId}/approve`);
      if (response.data.success) {
        toast.success(t('admin.verificationApprovedSuccess'));
        // Remove the verification from the list immediately
        setNIDVerifications(prev => prev.filter(v => v.id !== verificationId));
        // Refresh stats immediately to update pending count
        const statsResponse = await api.get('/api/admin/stats');
        if (statsResponse.data.success) {
          setStats(statsResponse.data.data);
        }
        // Refresh the verifications list to ensure consistency (only unreviewed ones)
        if (activeTab === 'nid-verifications') {
          const verificationsResponse = await api.get('/api/admin/nid-verifications/pending');
          if (verificationsResponse.data.success) {
            setNIDVerifications(verificationsResponse.data.data || []);
          }
        }
        fetchDashboardData();
        setShowNIDVerificationModal(false);
        setSelectedNIDVerification(null);
      }
    } catch (error) {
      console.error('Approve error:', error);
      toast.error(error.response?.data?.message || t('admin.failedToApprove'));
    }
  };

  const handleRejectNIDVerification = async (verificationId) => {
    const reason = prompt(t('admin.rejectionReasonPrompt'));
    if (!reason) return;
    
    try {
      const response = await api.put(`/api/admin/nid-verifications/${verificationId}/reject`, { 
        rejection_reason: reason 
      });
      if (response.data.success) {
        toast.success(t('admin.verificationRejectedSuccess'));
        // Remove the verification from the list immediately
        setNIDVerifications(prev => prev.filter(v => v.id !== verificationId));
        // Refresh stats immediately to update pending count
        const statsResponse = await api.get('/api/admin/stats');
        if (statsResponse.data.success) {
          setStats(statsResponse.data.data);
        }
        // Refresh the verifications list to ensure consistency (only unreviewed ones)
        if (activeTab === 'nid-verifications') {
          const verificationsResponse = await api.get('/api/admin/nid-verifications/pending');
          if (verificationsResponse.data.success) {
            setNIDVerifications(verificationsResponse.data.data || []);
          }
        }
        fetchDashboardData();
        setShowNIDVerificationModal(false);
        setSelectedNIDVerification(null);
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast.error(error.response?.data?.message || t('admin.failedToReject'));
    }
  };

  const handleActivateWorker = async (userId) => {
    if (!window.confirm(t('admin.confirmActivateWorker'))) return;
    
    try {
      const response = await api.put(`/api/admin/users/${userId}/activate`);
      if (response.data.success) {
        toast.success(t('admin.workerActivatedSuccess'));
        fetchDashboardData();
        // Refresh the modal data
        if (selectedNIDVerification) {
          const detailsResponse = await api.get(`/api/admin/nid-verifications/${selectedNIDVerification.id}`);
          if (detailsResponse.data.success) {
            setSelectedNIDVerification(detailsResponse.data.data);
          }
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('admin.failedToActivateWorker'));
    }
  };

  const handleDeactivateWorker = async (userId) => {
    if (!window.confirm(t('admin.confirmDeactivateWorker'))) return;
    
    try {
      const response = await api.put(`/api/admin/users/${userId}/deactivate`);
      if (response.data.success) {
        toast.success(t('admin.workerDeactivatedSuccess'));
        fetchDashboardData();
        // Refresh the modal data
        if (selectedNIDVerification) {
          const detailsResponse = await api.get(`/api/admin/nid-verifications/${selectedNIDVerification.id}`);
          if (detailsResponse.data.success) {
            setSelectedNIDVerification(detailsResponse.data.data);
          }
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('admin.failedToDeactivateWorker'));
    }
  };

  const renderNIDVerifications = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <Loader />
        </div>
      );
    }

    // Separate verifications by status
    // Pending verifications go to auto-rejected section (they need review)
    const approvedVerifications = nidVerifications
      .filter(v => v.verification_status === 'approved')
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    
    const rejectedVerifications = nidVerifications
      .filter(v => v.verification_status === 'auto_rejected' || v.verification_status === 'rejected' || v.verification_status === 'pending')
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

    const renderVerificationList = (verifications, title, emptyMessage, statusColor) => {
      if (verifications.length === 0) {
        return null;
      }

      return (
        <div className="card mb-6">
          <h2 className={`text-xl font-bold mb-4 ${statusColor}`}>{title}</h2>
          <div className="space-y-4">
            {verifications.map((verification) => {
                const extractedData = typeof verification.extracted_data === 'string' 
                  ? JSON.parse(verification.extracted_data) 
                  : verification.extracted_data;
                
                return (
                  <div key={verification.id} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {verification.user_full_name}
                          </h3>
                          <span className="text-sm text-gray-500">({verification.email})</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {t('admin.submitted')}: {new Date(verification.submitted_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedNIDVerification(verification);
                            setShowNIDVerificationModal(true);
                          }}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          {t('admin.viewDetails')}
                        </button>
                        <button
                          onClick={() => handleApproveNIDVerification(verification.id)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          {t('admin.approve')}
                        </button>
                        <button
                          onClick={() => handleRejectNIDVerification(verification.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          {t('admin.reject')}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500">{t('admin.confidence')}</p>
                        <p className="text-sm font-medium">
                          {verification.extraction_confidence}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('admin.imageQuality')}</p>
                        <p className="text-sm font-medium">{verification.image_quality}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('admin.nameMatch')}</p>
                        <p className="text-sm font-medium">
                          {verification.name_match ? '✅ Yes' : '❌ No'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('admin.ageValid')}</p>
                        <p className="text-sm font-medium">
                          {verification.age_valid ? '✅ Yes' : '❌ No'}
                        </p>
                      </div>
                    </div>

                    {extractedData && (
                      <div className="mt-4 p-3 bg-gray-50 rounded">
                        <p className="text-xs font-medium text-gray-700 mb-1">{t('admin.extractedData')}:</p>
                        <div className="text-xs text-gray-600 space-y-1">
                          <p><strong>{t('admin.name')}:</strong> {extractedData.full_name || 'N/A'}</p>
                          <p><strong>{t('admin.nidNumber')}:</strong> {extractedData.nid_number || 'N/A'}</p>
                          {extractedData.date_of_birth && (
                            <p><strong>{t('admin.dateOfBirth')}:</strong> {extractedData.date_of_birth}</p>
                          )}
                          {extractedData.gender && (
                            <p><strong>{t('admin.gender')}:</strong> {extractedData.gender}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
    };

    return (
      <div className="space-y-6">
        {/* Two-column layout for Auto-Approved and Auto-Rejected */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Auto-Approved Verifications */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4 text-green-600 flex items-center">
              ✅ {t('admin.autoApproved')}
              {approvedVerifications.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-bold text-white bg-green-500 rounded-full">
                  {approvedVerifications.length}
                </span>
              )}
            </h2>
            <div className="space-y-4 max-h-[800px] overflow-y-auto">
              {approvedVerifications.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">✅</div>
                  <p className="text-gray-600 text-sm">{t('admin.noAutoApproved')}</p>
                </div>
              ) : (
                approvedVerifications.map((verification) => {
                  const extractedData = typeof verification.extracted_data === 'string' 
                    ? JSON.parse(verification.extracted_data) 
                    : verification.extracted_data;
                  
                  return (
                    <div key={verification.id} className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-base font-semibold text-gray-900">
                              {verification.user_full_name}
                            </h3>
                            <span className="text-xs text-gray-500">({verification.email})</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {new Date(verification.submitted_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => {
                              setSelectedNIDVerification(verification);
                              setShowNIDVerificationModal(true);
                            }}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            {t('admin.view')}
                          </button>
                          <button
                            onClick={() => handleApproveNIDVerification(verification.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            {t('admin.approve')}
                          </button>
                          <button
                            onClick={() => handleRejectNIDVerification(verification.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            {t('admin.reject')}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div>
                          <p className="text-gray-500">{t('admin.confidence')}</p>
                          <p className="font-medium">{verification.extraction_confidence}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t('admin.quality')}</p>
                          <p className="font-medium">{verification.image_quality}</p>
                        </div>
                      </div>

                      {extractedData && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <p><strong>{t('admin.name')}:</strong> {extractedData.full_name || 'N/A'}</p>
                          <p><strong>{t('admin.nidNumber')}:</strong> {extractedData.nid_number || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Auto-Rejected Verifications */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4 text-red-600 flex items-center">
              ❌ {t('admin.autoRejected')}
              {rejectedVerifications.length > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">
                  {rejectedVerifications.length}
                </span>
              )}
            </h2>
            <div className="space-y-4 max-h-[800px] overflow-y-auto">
              {rejectedVerifications.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">❌</div>
                  <p className="text-gray-600 text-sm">{t('admin.noAutoRejected')}</p>
                </div>
              ) : (
                rejectedVerifications.map((verification) => {
                  const extractedData = typeof verification.extracted_data === 'string' 
                    ? JSON.parse(verification.extracted_data) 
                    : verification.extracted_data;
                  
                  return (
                    <div key={verification.id} className="border border-gray-200 rounded-lg p-4 hover:border-red-300 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-base font-semibold text-gray-900">
                              {verification.user_full_name}
                            </h3>
                            <span className="text-xs text-gray-500">({verification.email})</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {new Date(verification.submitted_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => {
                              setSelectedNIDVerification(verification);
                              setShowNIDVerificationModal(true);
                            }}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            {t('admin.view')}
                          </button>
                          <button
                            onClick={() => handleApproveNIDVerification(verification.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            {t('admin.approve')}
                          </button>
                          <button
                            onClick={() => handleRejectNIDVerification(verification.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            {t('admin.reject')}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div>
                          <p className="text-gray-500">{t('admin.confidence')}</p>
                          <p className="font-medium">{verification.extraction_confidence}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t('admin.quality')}</p>
                          <p className="font-medium">{verification.image_quality}</p>
                        </div>
                      </div>

                      {verification.verification_status === 'pending' && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                          <p className="text-yellow-800"><strong>{t('admin.status')}:</strong> {t('admin.pendingReview')}</p>
                        </div>
                      )}
                      {verification.auto_rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                          <p className="text-red-800"><strong>{t('admin.reason')}:</strong> {verification.auto_rejection_reason}</p>
                        </div>
                      )}

                      {extractedData && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <p><strong>{t('admin.name')}:</strong> {extractedData.full_name || 'N/A'}</p>
                          <p><strong>{t('admin.nidNumber')}:</strong> {extractedData.nid_number || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>


        {/* Empty State */}
        {nidVerifications.length === 0 && (
          <div className="card">
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">✅</div>
              <p className="text-gray-600">{t('admin.noVerifications')}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReports = () => (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">{t('admin.reports')}</h2>
      
      {reports.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📋</div>
          <p className="text-gray-600">{t('admin.noReports')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      report.status === 'investigating' ? 'bg-blue-100 text-blue-800' :
                      report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {report.status}
                    </span>
                    <span className="text-sm text-gray-600">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    <strong>{t('admin.reporter')}:</strong> {report.reporter_name}
                  </p>
                  <p className="text-sm text-gray-900 mb-1">
                    <strong>{t('admin.reportedUser')}:</strong> {report.reported_user_name}
                  </p>
                  <p className="text-sm text-gray-900 mb-2">
                    <strong>{t('admin.reason')}:</strong> {report.reason}
                  </p>
                  {report.description && (
                    <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                  )}
                </div>
                
                <div className="ml-4">
                  <select
                    value={report.status}
                    onChange={(e) => handleUpdateReportStatus(report.id, e.target.value)}
                    className="text-sm border-gray-300 rounded-md"
                  >
                    <option value="pending">{t('admin.pending')}</option>
                    <option value="investigating">{t('admin.investigating')}</option>
                    <option value="resolved">{t('admin.resolved')}</option>
                    <option value="dismissed">{t('admin.dismissed')}</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (loading && activeTab === 'overview') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('admin.adminDashboard')}</h1>
            <p className="mt-2 text-gray-600">{t('admin.managePlatform')}</p>
          </div>
          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {t('admin.changePassword')}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: t('admin.overview') },
              { id: 'nid-verifications', label: t('admin.nidVerifications'), badge: stats?.pending_verifications },
              { id: 'users', label: t('admin.users') },
              { id: 'categories', label: t('admin.categories') },
              { id: 'products', label: t('admin.products') },
              { id: 'reports', label: t('admin.reports') },
              { id: 'blogs', label: t('admin.blogs') },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'nid-verifications' && renderNIDVerifications()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'categories' && <CategoryManagement />}
            {activeTab === 'products' && <ProductManagement />}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'blogs' && <BlogManagement />}
          </>
        )}
      </div>

      {/* NID Verification Details Modal */}
      <Modal
        isOpen={showNIDVerificationModal}
        onClose={() => {
          setShowNIDVerificationModal(false);
          setSelectedNIDVerification(null);
        }}
        title={t('admin.nidVerificationDetails')}
      >
        {selectedNIDVerification && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{t('admin.workerInformation')}</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">{t('auth.fullName')}</p>
                    <p className="font-medium text-gray-900">{selectedNIDVerification.user_full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">{t('admin.email')}</p>
                    <p className="font-medium text-gray-900">{selectedNIDVerification.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">{t('admin.phone')}</p>
                    <p className="font-medium text-gray-900">{selectedNIDVerification.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">{t('auth.address')}</p>
                    <p className="font-medium text-gray-900">{selectedNIDVerification.address || t('admin.notSet')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">{t('admin.accountStatus')}</p>
                    <p className={`font-medium ${selectedNIDVerification.is_active ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedNIDVerification.is_active ? t('admin.active') : t('admin.inactive')}
                    </p>
                  </div>
                  {selectedNIDVerification.service_category_name && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1">{t('worker.serviceCategory')}</p>
                      <p className="font-medium text-gray-900">{selectedNIDVerification.service_category_name}</p>
                    </div>
                  )}
                  {selectedNIDVerification.experience_years !== null && selectedNIDVerification.experience_years !== undefined && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1">{t('worker.experienceYears')}</p>
                      <p className="font-medium text-gray-900">{selectedNIDVerification.experience_years} {t('worker.years')}</p>
                    </div>
                  )}
                  {selectedNIDVerification.hourly_rate !== null && selectedNIDVerification.hourly_rate !== undefined && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1">{t('worker.hourlyRate')}</p>
                      <p className="font-medium text-gray-900">৳{selectedNIDVerification.hourly_rate}</p>
                    </div>
                  )}
                  {selectedNIDVerification.average_rating !== null && selectedNIDVerification.average_rating !== undefined && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1">{t('worker.averageRating')}</p>
                      <p className="font-medium text-gray-900">
                        {parseFloat(selectedNIDVerification.average_rating || 0).toFixed(1)} ⭐ ({selectedNIDVerification.total_reviews || 0} {t('worker.reviews')})
                      </p>
                    </div>
                  )}
                  {selectedNIDVerification.total_jobs_completed !== null && selectedNIDVerification.total_jobs_completed !== undefined && (
                    <div>
                      <p className="text-gray-500 text-xs mb-1">{t('worker.totalJobs')}</p>
                      <p className="font-medium text-gray-900">{selectedNIDVerification.total_jobs_completed || 0}</p>
                    </div>
                  )}
                </div>
                {selectedNIDVerification.bio && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-gray-500 text-xs mb-1">{t('worker.bio')}</p>
                    <p className="text-sm text-gray-900">{selectedNIDVerification.bio}</p>
                  </div>
                )}
                {selectedNIDVerification.skills && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-gray-500 text-xs mb-2">{t('worker.skills')}</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(selectedNIDVerification.skills) && selectedNIDVerification.skills.length > 0 ? (
                        selectedNIDVerification.skills.map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">{t('worker.noSkillsListed')}</span>
                      )}
                    </div>
                  </div>
                )}
                {selectedNIDVerification.availability_status && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-gray-500 text-xs mb-1">{t('worker.availabilityStatus')}</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      selectedNIDVerification.availability_status === 'available' ? 'bg-green-100 text-green-800' :
                      selectedNIDVerification.availability_status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedNIDVerification.availability_status.charAt(0).toUpperCase() + selectedNIDVerification.availability_status.slice(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('admin.verificationDetails')}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>{t('admin.status')}:</strong> {selectedNIDVerification.verification_status}</p>
                <p><strong>{t('admin.confidence')}:</strong> {selectedNIDVerification.extraction_confidence}%</p>
                <p><strong>{t('admin.imageQuality')}:</strong> {selectedNIDVerification.image_quality}</p>
                <p><strong>{t('admin.language')}:</strong> {selectedNIDVerification.language_detected}</p>
                <p><strong>{t('admin.nameMatch')}:</strong> {selectedNIDVerification.name_match ? t('common.yes') : t('common.no')}</p>
                <p><strong>{t('admin.ageValid')}:</strong> {selectedNIDVerification.age_valid ? t('common.yes') : t('common.no')}</p>
                <p><strong>{t('admin.tamperingSuspected')}:</strong> {selectedNIDVerification.tampering_suspected ? t('common.yes') : t('common.no')}</p>
                {selectedNIDVerification.auto_rejection_reason && (
                  <p><strong>{t('admin.autoRejectionReason')}:</strong> {selectedNIDVerification.auto_rejection_reason}</p>
                )}
                {selectedNIDVerification.auto_approval_reason && (
                  <p><strong>{t('admin.autoApprovalReason')}:</strong> {selectedNIDVerification.auto_approval_reason}</p>
                )}
              </div>
            </div>

            {selectedNIDVerification.extracted_data && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('admin.extractedNIDData')}</h3>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <pre className="whitespace-pre-wrap text-gray-700">
                    {JSON.stringify(
                      typeof selectedNIDVerification.extracted_data === 'string'
                        ? JSON.parse(selectedNIDVerification.extracted_data)
                        : selectedNIDVerification.extracted_data,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            )}

            {/* Face Verification Images and Match Details */}
            {(selectedNIDVerification.nid_image_url || selectedNIDVerification.selfie_image_url || selectedNIDVerification.profile_photo) && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('admin.faceVerificationImages')}</h3>
                
                {/* Parse face verification results */}
                {(() => {
                  let faceMatches = null;
                  if (selectedNIDVerification.face_verification_results) {
                    try {
                      faceMatches = typeof selectedNIDVerification.face_verification_results === 'string'
                        ? JSON.parse(selectedNIDVerification.face_verification_results)
                        : selectedNIDVerification.face_verification_results;
                    } catch (e) {
                      console.error('Error parsing face_verification_results:', e);
                    }
                  }
                  
                  // Extract match data and calculate confidence if not present
                  const nidMatch = faceMatches?.nid;
                  const profileMatch = faceMatches?.profile;
                  
                  // Calculate confidence from distance if not already present
                  const calculateConfidence = (match) => {
                    if (!match) return null;
                    if (match.confidence !== undefined) return match.confidence;
                    if (match.distance !== undefined) {
                      // Confidence = (1 - distance / threshold) * 100, where threshold is 0.6
                      const threshold = 0.6;
                      const confidence = Math.max(0, Math.min(100, Math.round((1 - match.distance / threshold) * 100)));
                      return confidence;
                    }
                    return null;
                  };
                  
                  // Add calculated confidence if missing
                  if (nidMatch && nidMatch.confidence === undefined && nidMatch.distance !== undefined) {
                    nidMatch.confidence = calculateConfidence(nidMatch);
                  }
                  if (profileMatch && profileMatch.confidence === undefined && profileMatch.distance !== undefined) {
                    profileMatch.confidence = calculateConfidence(profileMatch);
                  }
                  
                  return (
                    <div className="space-y-4">
                      {/* Three Images Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Selfie Image */}
                        {selectedNIDVerification.selfie_image_url && (
                          <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                            <p className="text-xs font-semibold text-gray-700 mb-2 text-center">Live Selfie</p>
                            <img
                              src={selectedNIDVerification.selfie_image_url}
                              alt="Live Selfie"
                              className="w-full h-auto border border-gray-300 rounded"
                            />
                            <p className="text-xs text-gray-500 mt-2 text-center">Reference Image</p>
                          </div>
                        )}
                        
                        {/* Profile Photo */}
                        {selectedNIDVerification.profile_photo && (
                          <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                            <p className="text-xs font-semibold text-gray-700 mb-2 text-center">Profile Photo</p>
                            <img
                              src={selectedNIDVerification.profile_photo}
                              alt="Profile Photo"
                              className="w-full h-auto border border-gray-300 rounded"
                            />
                            {profileMatch && (
                              <div className={`mt-2 p-2 rounded text-center ${
                                profileMatch.matched ? 'bg-green-100' : 'bg-red-100'
                              }`}>
                                <p className={`text-xs font-semibold ${
                                  profileMatch.matched ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {profileMatch.matched ? '✅ Match' : '❌ No Match'}
                                </p>
                                {profileMatch.confidence !== undefined && (
                                  <p className={`text-xs font-bold ${
                                    profileMatch.matched ? 'text-green-900' : 'text-red-900'
                                  }`}>
                                    {profileMatch.confidence}% Match
                                  </p>
                                )}
                                {profileMatch.distance !== undefined && (
                                  <p className="text-xs text-gray-600">
                                    Distance: {profileMatch.distance.toFixed(4)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* NID Image */}
                        {selectedNIDVerification.nid_image_url && (
                          <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                            <p className="text-xs font-semibold text-gray-700 mb-2 text-center">NID Photo</p>
                            <img
                              src={selectedNIDVerification.nid_image_url}
                              alt="NID"
                              className="w-full h-auto border border-gray-300 rounded"
                            />
                            {nidMatch && (
                              <div className={`mt-2 p-2 rounded text-center ${
                                nidMatch.matched ? 'bg-green-100' : 'bg-red-100'
                              }`}>
                                <p className={`text-xs font-semibold ${
                                  nidMatch.matched ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {nidMatch.matched ? '✅ Match' : '❌ No Match'}
                                </p>
                                {nidMatch.confidence !== undefined && (
                                  <p className={`text-xs font-bold ${
                                    nidMatch.matched ? 'text-green-900' : 'text-red-900'
                                  }`}>
                                    {nidMatch.confidence}% Match
                                  </p>
                                )}
                                {nidMatch.distance !== undefined && (
                                  <p className="text-xs text-gray-600">
                                    Distance: {nidMatch.distance.toFixed(4)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Match Summary */}
                      {(nidMatch || profileMatch) && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-900 mb-3 text-sm">Match Summary (Based on Selfie)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Selfie vs Profile Match */}
                            {profileMatch && (
                              <div className="bg-white rounded p-3 border border-blue-200">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Selfie vs Profile Photo</p>
                                <div className="flex items-center justify-between">
                                  <span className={`text-lg font-bold ${
                                    profileMatch.matched ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {profileMatch.confidence !== undefined ? `${profileMatch.confidence}%` : 'N/A'}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    profileMatch.matched ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {profileMatch.matched ? '✅ Passed' : '❌ Failed'}
                                  </span>
                                </div>
                                {profileMatch.distance !== undefined && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Euclidean Distance: {profileMatch.distance.toFixed(4)} (Threshold: &lt;0.6)
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {/* Selfie vs NID Match */}
                            {nidMatch && (
                              <div className="bg-white rounded p-3 border border-blue-200">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Selfie vs NID Photo</p>
                                <div className="flex items-center justify-between">
                                  <span className={`text-lg font-bold ${
                                    nidMatch.matched ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {nidMatch.confidence !== undefined ? `${nidMatch.confidence}%` : 'N/A'}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    nidMatch.matched ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {nidMatch.matched ? '✅ Passed' : '❌ Failed'}
                                  </span>
                                </div>
                                {nidMatch.distance !== undefined && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Euclidean Distance: {nidMatch.distance.toFixed(4)} (Threshold: &lt;0.6)
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Overall Face Match Status */}
                          {selectedNIDVerification.face_match_passed !== null && selectedNIDVerification.face_match_passed !== undefined && (
                            <div className={`mt-3 p-3 rounded ${
                              selectedNIDVerification.face_match_passed ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
                            }`}>
                              <div className="flex items-center justify-between">
                                <p className={`font-semibold text-sm ${
                                  selectedNIDVerification.face_match_passed ? 'text-green-900' : 'text-red-900'
                                }`}>
                                  Overall Face Verification Status:
                                </p>
                                <span className={`text-sm font-bold px-3 py-1 rounded ${
                                  selectedNIDVerification.face_match_passed ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'
                                }`}>
                                  {selectedNIDVerification.face_match_passed ? '✅ ALL MATCHES PASSED' : '❌ VERIFICATION FAILED'}
                                </span>
                              </div>
                              <p className={`text-xs mt-1 ${
                                selectedNIDVerification.face_match_passed ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {selectedNIDVerification.face_match_passed 
                                  ? 'All three images (Selfie, Profile, NID) matched successfully.'
                                  : 'One or more face matches failed. All three images must match for verification.'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="space-y-3 pt-4 border-t">
              {/* Worker Activation Controls */}
              {selectedNIDVerification.role === 'worker' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Worker Account Activation</p>
                  <div className="flex space-x-2">
                    {selectedNIDVerification.is_active ? (
                      <button
                        onClick={() => handleDeactivateWorker(selectedNIDVerification.user_id)}
                        className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded hover:bg-orange-700"
                      >
                        Deactivate Account
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivateWorker(selectedNIDVerification.user_id)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                      >
                        Activate Account
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    {selectedNIDVerification.is_active 
                      ? 'Worker account is active and can receive bookings.'
                      : 'Worker account is inactive. Activate to allow bookings.'}
                  </p>
                </div>
              )}
              
              {/* Verification Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleRejectNIDVerification(selectedNIDVerification.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                >
                  Reject Verification
                </button>
                <button
                  onClick={() => handleApproveNIDVerification(selectedNIDVerification.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                >
                  Approve Verification
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        title={t('admin.changePassword')}
      >
        <ChangePassword onClose={() => setShowChangePasswordModal(false)} />
      </Modal>
    </div>
  );
};

export default AdminDashboard;