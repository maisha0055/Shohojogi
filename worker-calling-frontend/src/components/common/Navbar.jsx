import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import useSocket from '../../hooks/useSocket';
import CallRequestModal from '../booking/CallRequestModal';
import { useCart } from '../../context/CartContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const { getCartCount } = useCart();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [jobAlerts, setJobAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [jobAlertCount, setJobAlertCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showJobAlerts, setShowJobAlerts] = useState(false);
  const [selectedCallRequest, setSelectedCallRequest] = useState(null);
  const [showCallRequestModal, setShowCallRequestModal] = useState(false);
  const { socket, connected, on, off } = useSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      // Fetch regular notifications (exclude job alerts)
      const response = await api.get('/api/users/notifications?limit=10&exclude_type=job_alert');
      if (response.data.success) {
        const regularNotifications = (response.data.data.notifications || []).filter(
          n => n.type !== 'job_alert' && n.type !== 'call_worker'
        );
        setNotifications(regularNotifications);
        setUnreadCount(response.data.data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const fetchJobAlerts = useCallback(async () => {
    try {
      // Fetch job alerts (instant call requests)
      const response = await api.get('/api/users/job-alerts?limit=10');
      if (response.data.success) {
        setJobAlerts(response.data.data.alerts || []);
        setJobAlertCount(response.data.data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching job alerts:', error);
      // Set empty state on error to prevent crashes
      setJobAlerts([]);
      setJobAlertCount(0);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
      if (user.role === 'worker') {
        fetchJobAlerts();
      }
      const interval = setInterval(() => {
        fetchNotifications();
        if (user.role === 'worker') {
          fetchJobAlerts();
        }
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user, fetchNotifications, fetchJobAlerts]);

  // Listen for real-time job alerts via socket
  useEffect(() => {
    if (socket && connected && user && user.role === 'worker') {
      const handleCallRequest = (data) => {
        // Refresh job alerts when a new call request is received
        fetchJobAlerts();
      };

      on('worker:call-request', handleCallRequest);

      return () => {
        off('worker:call-request', handleCallRequest);
      };
    }
  }, [socket, connected, user, on, off, fetchJobAlerts]);

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/api/users/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'admin':
        return '/admin';
      case 'worker':
        return '/worker-dashboard';
      case 'user':
      default:
        return '/dashboard';
    }
  };

  return (
    <>
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
            <img
              src={process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/logo.png` : '/logo.png'}
              alt="Shohojogi Logo"
              className="h-14 w-auto"
            />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Dashboard */}
                <Link
                  to={getDashboardLink()}
                  className="text-gray-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('common.dashboard')}
                </Link>
                {/* My Bookings */}
                {user?.role !== 'admin' && (
                  <Link
                    to="/bookings"
                    className="text-gray-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {t('booking.myBookings')}
                  </Link>
                )}
                {/* Cart for Worker Bookings */}
                {user?.role === 'user' && (
                  <Link
                    to="/cart"
                    className="relative text-gray-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    🛒 {t('common.cart')}
                    {getCartCount() > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {getCartCount() > 9 ? '9+' : getCartCount()}
                      </span>
                    )}
                  </Link>
                )}
                
                {/* Notifications with round badge */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      setShowJobAlerts(false);
                    }}
                    className="relative text-gray-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium"
                  >
                     {t('common.notifications')}
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">{t('common.notifications')}</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={async () => {
                              try {
                                await api.put('/api/users/notifications/read-all');
                                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                                setUnreadCount(0);
                              } catch (error) {
                                console.error('Error marking all as read:', error);
                              }
                            }}
                            className="text-xs text-primary-500 hover:text-primary-600"
                          >
                            {t('common.markAllRead')}
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-gray-200">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            {t('common.noNotifications')}
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              onClick={async () => {
                                if (!notification.is_read) markAsRead(notification.id);
                                setShowNotifications(false);
                                if (notification.type === 'booking' && notification.reference_id) {
                                  // Check if this is an instant call request (call_worker type)
                                  // If title contains "Instant Call Request", it's a call_worker booking
                                  if (notification.title?.includes('Instant Call Request')) {
                                    // Open call request modal to show full details
                                    setSelectedCallRequest(notification.reference_id);
                                    setShowCallRequestModal(true);
                                  } else {
                                    // Regular booking - navigate to bookings page
                                    navigate(`/bookings`);
                                  }
                                } else if (notification.type === 'message') {
                                  navigate(`/chat`);
                                }
                              }}
                              className={`p-3 cursor-pointer hover:bg-gray-50 ${
                                !notification.is_read ? 'bg-blue-50' : ''
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  {!notification.is_read && (
                                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notification.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Job Alerts for Workers (Instant Call Requests) - Separate from notifications */}
                {user?.role === 'worker' && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowJobAlerts(!showJobAlerts);
                        setShowNotifications(false);
                      }}
                      className="relative text-gray-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      🚨 {t('common.jobAlert')}
                      {jobAlertCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                          {jobAlertCount > 9 ? '9+' : jobAlertCount}
                        </span>
                      )}
                    </button>
                    
                    {/* Job Alerts Dropdown */}
                    {showJobAlerts && (
                      <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                        <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                          <h3 className="font-semibold text-gray-900">{t('common.jobAlerts')}</h3>
                          {jobAlertCount > 0 && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.put('/api/users/job-alerts/read-all');
                                  setJobAlerts(prev => prev.map(n => ({ ...n, is_read: true })));
                                  setJobAlertCount(0);
                                } catch (error) {
                                  console.error('Error marking all as read:', error);
                                }
                              }}
                              className="text-xs text-primary-500 hover:text-primary-600"
                            >
                              {t('common.markAllRead')}
                            </button>
                          )}
                        </div>
                        <div className="divide-y divide-gray-200">
                          {jobAlerts.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              {t('common.noJobAlerts')}
                            </div>
                          ) : (
                            jobAlerts.map((alert) => (
                              <div
                                key={alert.id}
                                onClick={() => {
                                  if (!alert.is_read) {
                                    api.put(`/api/users/job-alerts/${alert.id}/read`).catch(() => {});
                                    setJobAlerts(prev => 
                                      prev.map(n => n.id === alert.id ? { ...n, is_read: true } : n)
                                    );
                                    setJobAlertCount(prev => Math.max(0, prev - 1));
                                  }
                                  setShowJobAlerts(false);
                                  // Open call request modal with booking ID from reference_id
                                  if (alert.reference_id) {
                                    setSelectedCallRequest(alert.reference_id);
                                    setShowCallRequestModal(true);
                                  } else {
                                    navigate('/worker-dashboard');
                                  }
                                }}
                                className={`p-3 cursor-pointer hover:bg-gray-50 ${
                                  !alert.is_read ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="flex-shrink-0">
                                    {!alert.is_read && (
                                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">
                                      {alert.title}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {alert.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(alert.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Language Toggle Button */}
                <button
                  onClick={toggleLanguage}
                  className="text-gray-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium border border-gray-300 hover:border-primary-400 transition-colors"
                  title={language === 'en' ? t('common.switchToBangla') : t('common.switchToEnglish')}
                >
                  {language === 'en' ? '🇬🇧' : '🇧🇩'}
                </button>
                
                {/* User Menu with Hamburger (3 lines) */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-500"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary-400 text-white flex items-center justify-center">
                      {user?.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{user?.full_name}</span>
                    {/* 3 lines hamburger icon */}
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <div className="px-4 py-2 text-xs text-gray-500 border-b">
                        {user?.email}
                      </div>
                      <Link
                        to="/"
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                         {t('common.home')}
                      </Link>
                      <Link
                        to={getDashboardLink()}
                        onClick={() => setUserMenuOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                         {t('common.profile')}
                      </Link>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                         {t('common.logout')}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Language Toggle Button */}
                <button
                  onClick={toggleLanguage}
                  className="text-gray-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium border border-gray-300 hover:border-primary-400 transition-colors"
                  title={language === 'en' ? t('common.switchToBangla') : t('common.switchToEnglish')}
                >
                  {language === 'en' ? '🇬🇧 EN' : '🇧🇩 BN'}
                </button>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary-500 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('common.login')}
                </Link>
                <Link
                  to="/register"
                  className="btn-primary"
                >
                  {t('auth.signUp')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="text-gray-700 hover:text-primary-500 focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isAuthenticated ? (
              <>
                {/* Dashboard */}
                <Link
                  to={getDashboardLink()}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('common.dashboard')}
                </Link>
                {/* My Bookings */}
                {user?.role !== 'admin' && (
                  <Link
                    to="/bookings"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('booking.myBookings')}
                  </Link>
                )}
                {/* Cart for Worker Bookings (Mobile) */}
                {user?.role === 'user' && (
                  <Link
                    to="/cart"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 relative"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    🛒 {t('common.cart')}
                    {getCartCount() > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {getCartCount() > 9 ? '9+' : getCartCount()}
                      </span>
                    )}
                  </Link>
                )}
                {/* Notifications */}
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    setShowJobAlerts(false);
                  }}
                  className="relative w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                >
                  🔔 {t('common.notifications')}
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {/* Language Toggle Button - Mobile */}
                <button
                  onClick={() => {
                    toggleLanguage();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 border border-gray-300"
                >
                  {language === 'en' ? `🇬🇧 ${t('common.switchToBangla')}` : `🇧🇩 ${t('common.switchToEnglish')}`}
                </button>
                {/* Job Alerts for Workers - Mobile */}
                {user?.role === 'worker' && (
                  <button
                    onClick={() => {
                      setShowJobAlerts(!showJobAlerts);
                      setShowNotifications(false);
                    }}
                    className="relative w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  >
                    🚨 Job Alert
                    {jobAlertCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 animate-pulse">
                        {jobAlertCount}
                      </span>
                    )}
                  </button>
                )}
                {showJobAlerts && user?.role === 'worker' && (
                  <div className="px-3 py-2 bg-gray-50 rounded-md max-h-64 overflow-y-auto">
                    {jobAlerts.length === 0 ? (
                      <p className="text-sm text-gray-500">{t('common.noJobAlerts')}</p>
                    ) : (
                      jobAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          onClick={() => {
                            if (!alert.is_read) {
                              api.put(`/api/users/job-alerts/${alert.id}/read`).catch(() => {});
                              setJobAlerts(prev => 
                                prev.map(n => n.id === alert.id ? { ...n, is_read: true } : n)
                              );
                              setJobAlertCount(prev => Math.max(0, prev - 1));
                            }
                            setShowJobAlerts(false);
                            setMobileMenuOpen(false);
                            // Open call request modal with booking ID from reference_id
                            if (alert.reference_id) {
                              setSelectedCallRequest(alert.reference_id);
                              setShowCallRequestModal(true);
                            } else {
                              navigate('/worker-dashboard');
                            }
                          }}
                          className={`p-2 mb-2 rounded cursor-pointer ${
                            !alert.is_read ? 'bg-blue-100' : 'bg-white'
                          }`}
                        >
                          <p className="text-sm font-medium">{alert.title}</p>
                          <p className="text-xs text-gray-600">{alert.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {showNotifications && (
                  <div className="px-3 py-2 bg-gray-50 rounded-md max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-500">{t('common.noNotifications')}</p>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={async () => {
                            if (!notification.is_read) markAsRead(notification.id);
                            setShowNotifications(false);
                            setMobileMenuOpen(false);
                            if (notification.type === 'booking' && notification.reference_id) {
                              // Check if this is an instant call request (call_worker type)
                              // If title contains "Instant Call Request", it's a call_worker booking
                              if (notification.title?.includes('Instant Call Request')) {
                                // Open call request modal to show full details
                                setSelectedCallRequest(notification.reference_id);
                                setShowCallRequestModal(true);
                              } else {
                                // Regular booking - navigate to bookings page
                                navigate(`/bookings`);
                              }
                            } else if (notification.type === 'message') {
                              navigate(`/chat`);
                            }
                          }}
                          className={`p-2 mb-2 rounded cursor-pointer ${
                            !notification.is_read ? 'bg-blue-100' : 'bg-white'
                          }`}
                        >
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-gray-600">{notification.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
                <div className="px-3 py-2 border-t border-gray-200 mt-2">
                  <div className="text-sm font-medium text-gray-900">{user?.full_name}</div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                </div>
                <Link
                  to="/"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('common.home')}
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-gray-50"
                >
                  {t('common.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('common.login')}
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium text-white bg-primary-400 hover:bg-primary-500"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('auth.signUp')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Call Request Modal for Workers */}
      {user?.role === 'worker' && (
        <CallRequestModal
          isOpen={showCallRequestModal}
          onClose={() => {
            setShowCallRequestModal(false);
            setSelectedCallRequest(null);
            // Refresh job alerts after closing
            if (user?.role === 'worker') {
              fetchJobAlerts();
            }
          }}
          bookingId={selectedCallRequest}
          onAccepted={(data) => {
            // Refresh job alerts after acceptance
            if (user?.role === 'worker') {
              fetchJobAlerts();
            }
            // Navigate to dashboard to see accepted booking
            navigate('/worker-dashboard');
          }}
        />
      )}

    </nav>
    </>
  );
};

export default Navbar;