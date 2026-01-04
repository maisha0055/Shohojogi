import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import ChangePassword from '../components/common/ChangePassword';
import { toast } from 'react-toastify';

const UserDashboard = () => {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  // Sync profileData with user when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, bookingsRes, favoritesRes] = await Promise.all([
        api.get('/api/users/dashboard'),
        api.get('/api/bookings/my-bookings?limit=5'),
        api.get('/api/users/favorites'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (bookingsRes.data.success) setRecentBookings(bookingsRes.data.data);
      if (favoritesRes.data.success) {
        // Normalize numeric fields from database (PostgreSQL returns DECIMAL as strings)
        const normalizedFavorites = (favoritesRes.data.data || []).map(worker => ({
          ...worker,
          average_rating: worker.average_rating ? parseFloat(worker.average_rating) : 0,
          hourly_rate: worker.hourly_rate ? parseFloat(worker.hourly_rate) : 0,
        }));
        setFavorites(normalizedFavorites);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error(t('user.failedToLoadDashboard'));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put('/api/users/profile', profileData);
      if (response.data.success) {
        updateUser(response.data.data);
        setEditMode(false);
        toast.success(t('user.profileUpdated'));
      }
    } catch (error) {
      toast.error(t('user.failedToUpdateProfile'));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      rejected: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('user.userDashboard')}</h1>
          <p className="mt-2 text-gray-600">{t('user.welcomeBack')}, {user?.full_name}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">{t('user.totalBookings')}</div>
            <div className="text-3xl font-bold text-primary-600">
              {stats?.total_bookings || 0}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">{t('user.activeBookings')}</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.active_bookings || 0}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">{t('user.completedBookings')}</div>
            <div className="text-3xl font-bold text-green-600">
              {stats?.completed_bookings || 0}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">{t('user.loyaltyPoints')}</div>
            <div className="text-3xl font-bold text-yellow-600">
              {user?.loyalty_points || stats?.loyalty_points || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {t('user.tier')}: <span className="font-semibold">{user?.loyalty_tier || 'Bronze'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Bookings */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{t('user.recentBookings')}</h2>
                <Link to="/bookings" className="text-primary-600 hover:text-primary-700 text-sm">
                  {t('user.viewAll')}
                </Link>
              </div>

              {recentBookings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📋</div>
                  <p className="text-gray-600">{t('user.noRecentBookings')}</p>
                  <Link to="/workers" className="btn-primary mt-4 inline-block">
                    {t('common.findWorkers')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors cursor-pointer"
                      onClick={() => navigate(`/bookings`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">
                              {booking.worker?.full_name}
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
                            <span>#{booking.booking_number}</span>
                            <span>{new Date(booking.created_at).toLocaleDateString()}</span>
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

            {/* Favorite Workers */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{t('user.favoriteWorkers')}</h2>
              </div>

              {favorites.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">❤️</div>
                  <p className="text-gray-600">{t('user.noFavorites')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favorites.slice(0, 4).map((worker) => (
                    <div
                      key={worker.id}
                      className="border border-gray-200 rounded-lg p-3 hover:border-primary-300 transition-colors cursor-pointer"
                      onClick={() => navigate(`/workers/${worker.id}`)}
                    >
                      <div className="flex items-center space-x-3">
                        {worker.profile_photo ? (
                          <img
                            src={worker.profile_photo}
                            alt={worker.full_name}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="font-bold text-primary-600">
                              {worker.full_name?.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {worker.full_name}
                          </h4>
                          <p className="text-xs text-gray-600">{worker.service_category}</p>
                          <div className="flex items-center mt-1">
                            <span className="text-yellow-400 text-sm">★</span>
                            <span className="text-xs ml-1">
                              {worker.average_rating ? worker.average_rating.toFixed(1) : '0.0'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{t('user.myProfile')}</h2>
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {t('common.edit')}
                  </button>
                )}
              </div>

              {editMode ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.fullName')}
                    </label>
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, full_name: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.phone')}
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({ ...profileData, phone: e.target.value })
                      }
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.address')}
                    </label>
                    <textarea
                      value={profileData.address}
                      onChange={(e) =>
                        setProfileData({ ...profileData, address: e.target.value })
                      }
                      rows={2}
                      className="input-field"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary flex-1">
                      {t('common.save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="btn-secondary flex-1"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500">{t('auth.fullName')}</div>
                    <div className="text-sm font-medium">{user?.full_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('auth.email')}</div>
                    <div className="text-sm font-medium">{user?.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">{t('auth.phone')}</div>
                    <div className="text-sm font-medium">{user?.phone}</div>
                  </div>
                  {user?.address && (
                    <div>
                      <div className="text-xs text-gray-500">{t('auth.address')}</div>
                      <div className="text-sm font-medium">{user?.address}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('user.quickActions')}</h2>
              <div className="space-y-2">
                <Link
                  to="/call-worker"
                  className="block w-full btn-primary text-center bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
                >
                  📞 {t('booking.callWorkersNow')}
                </Link>
                <Link
                  to="/workers"
                  className="block w-full btn-secondary text-center"
                >
                  {t('common.findWorkers')}
                </Link>
                <Link
                  to="/bookings"
                  className="block w-full btn-secondary text-center"
                >
                  {t('user.viewAllBookings')}
                </Link>
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="block w-full btn-secondary text-center"
                >
                  🔒 {t('user.changePassword')}
                </button>
                <Link
                  to="/chat"
                  className="block w-full btn-secondary text-center"
                >
                  {t('common.messages')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        title={t('user.changePassword')}
      >
        <ChangePassword onClose={() => setShowChangePasswordModal(false)} />
      </Modal>
    </div>
  );
};

export default UserDashboard;