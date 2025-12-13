import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  const { } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'overview') {
        const response = await api.get('/api/admin/stats');
        if (response.data.success) {
          setStats(response.data.data);
        }
      } else if (activeTab === 'verifications') {
        const response = await api.get('/api/admin/verifications/pending');
        if (response.data.success) {
          setPendingVerifications(response.data.data);
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
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVerification = async (workerId) => {
    if (!window.confirm('Are you sure you want to approve this worker?')) return;
    
    try {
      const response = await api.put(`/api/admin/verifications/${workerId}/approve`);
      if (response.data.success) {
        toast.success('Worker verified successfully!');
        fetchDashboardData();
        setShowVerificationModal(false);
      }
    } catch (error) {
      toast.error('Failed to approve verification');
    }
  };

  const handleRejectVerification = async (workerId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      const response = await api.put(`/api/admin/verifications/${workerId}/reject`, { reason });
      if (response.data.success) {
        toast.success('Verification rejected');
        fetchDashboardData();
        setShowVerificationModal(false);
      }
    } catch (error) {
      toast.error('Failed to reject verification');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
      const response = await api.put(`/api/admin/users/${userId}/${action}`);
      if (response.data.success) {
        toast.success(`User ${action}d successfully`);
        fetchDashboardData();
      }
    } catch (error) {
      toast.error(`Failed to ${action} user`);
    }
  };

  const handleToggleFeaturedWorker = async (workerId, currentStatus) => {
    try {
      const response = await api.put(`/api/admin/workers/${workerId}/feature`);
      if (response.data.success) {
        toast.success(currentStatus ? 'Worker unfeatured' : 'Worker featured');
        fetchDashboardData();
      }
    } catch (error) {
      toast.error('Failed to update featured status');
    }
  };

  const handleUpdateReportStatus = async (reportId, status) => {
    try {
      const response = await api.put(`/api/admin/reports/${reportId}`, { status });
      if (response.data.success) {
        toast.success('Report status updated');
        fetchDashboardData();
      }
    } catch (error) {
      toast.error('Failed to update report');
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Total Users</div>
          <div className="text-3xl font-bold text-primary-600">
            {stats?.total_users || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Total Workers</div>
          <div className="text-3xl font-bold text-blue-600">
            {stats?.total_workers || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Total Bookings</div>
          <div className="text-3xl font-bold text-green-600">
            {stats?.total_bookings || 0}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Platform Revenue</div>
          <div className="text-3xl font-bold text-yellow-600">
            ৳{stats?.total_revenue?.toLocaleString() || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Pending Verifications</h3>
          <div className="text-4xl font-bold text-yellow-600 mb-2">
            {stats?.pending_verifications || 0}
          </div>
          <button
            onClick={() => setActiveTab('verifications')}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Review Now →
          </button>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold mb-4">Open Reports</h3>
          <div className="text-4xl font-bold text-red-600 mb-2">
            {stats?.open_reports || 0}
          </div>
          <button
            onClick={() => setActiveTab('reports')}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            View Reports →
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
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
            <p className="text-gray-500 text-sm">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderVerifications = () => (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Pending Worker Verifications</h2>
      
      {pendingVerifications.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">✅</div>
          <p className="text-gray-600">No pending verifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingVerifications.map((worker) => (
            <div key={worker.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
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
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{worker.full_name}</h3>
                    <p className="text-sm text-gray-600">{worker.service_category_name}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500">📧 {worker.email}</p>
                      <p className="text-xs text-gray-500">📱 {worker.phone}</p>
                      <p className="text-xs text-gray-500">
                        🆔 NID: {worker.nid_number}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedWorker(worker);
                      setShowVerificationModal(true);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Review Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">User Management</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                    {user.is_active ? 'Active' : 'Inactive'}
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
                      {user.is_featured ? '⭐ Unfeature' : '☆ Feature'}
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                    className={user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">User Reports</h2>
      
      {reports.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📋</div>
          <p className="text-gray-600">No reports to review</p>
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
                    <strong>Reporter:</strong> {report.reporter_name}
                  </p>
                  <p className="text-sm text-gray-900 mb-1">
                    <strong>Reported User:</strong> {report.reported_user_name}
                  </p>
                  <p className="text-sm text-gray-900 mb-2">
                    <strong>Reason:</strong> {report.reason}
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
                    <option value="pending">Pending</option>
                    <option value="investigating">Investigating</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage platform users, verifications, and reports</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'verifications', label: 'Verifications' },
              { id: 'users', label: 'Users' },
              { id: 'reports', label: 'Reports' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
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
            {activeTab === 'verifications' && renderVerifications()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'reports' && renderReports()}
          </>
        )}
      </div>

      {/* Verification Modal */}
      <Modal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        title="Worker Verification Details"
        size="lg"
      >
        {selectedWorker && (
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              {selectedWorker.profile_photo ? (
                <img
                  src={selectedWorker.profile_photo}
                  alt={selectedWorker.full_name}
                  className="w-20 h-20 rounded-full"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-600">
                    {selectedWorker.full_name?.charAt(0)}
                  </span>
                </div>
              )}
              
              <div>
                <h3 className="text-lg font-semibold">{selectedWorker.full_name}</h3>
                <p className="text-gray-600">{selectedWorker.service_category_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900">{selectedWorker.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900">{selectedWorker.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">NID Number</label>
                <p className="text-sm text-gray-900">{selectedWorker.nid_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Experience</label>
                <p className="text-sm text-gray-900">{selectedWorker.experience_years} years</p>
              </div>
            </div>

            {selectedWorker.nid_image_url && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">NID Image</label>
                <img
                  src={selectedWorker.nid_image_url}
                  alt="NID"
                  className="w-full max-h-96 object-contain border border-gray-300 rounded-lg"
                />
              </div>
            )}

            {selectedWorker.extracted_nid_data && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">AI Verification Result</h4>
                <pre className="text-xs text-blue-800 overflow-auto">
                  {JSON.stringify(selectedWorker.extracted_nid_data, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleRejectVerification(selectedWorker.id)}
                className="btn-secondary flex-1"
              >
                Reject
              </button>
              <button
                onClick={() => handleApproveVerification(selectedWorker.id)}
                className="btn-primary flex-1"
              >
                Approve Verification
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDashboard;