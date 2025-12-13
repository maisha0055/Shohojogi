// WorkerDashboard.jsx - FIXED VERSION
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import workerService from "../services/workerService";
import api from "../services/api";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import { toast } from "react-toastify";

const WorkerDashboard = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showNIDModal, setShowNIDModal] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: "",
    hourly_rate: "",
    experience_years: "",
    skills: "",
    address: "",
  });
  const [nidData, setNidData] = useState({
    nid_number: "",
    nid_image_url: "",
  });
  const [availabilityChanging, setAvailabilityChanging] = useState(false);

  // Local state for availability to ensure UI updates immediately
  const [currentAvailability, setCurrentAvailability] = useState(
    user?.worker_info?.availability_status || "offline"
  );

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update local availability when user data changes
  useEffect(() => {
    if (user?.worker_info?.availability_status) {
      setCurrentAvailability(user.worker_info.availability_status);
    }
  }, [user?.worker_info?.availability_status]);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        workerService.getWorkerStats(),
        api.get("/api/bookings/worker-bookings?limit=5"),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (bookingsRes.data.success) setRecentBookings(bookingsRes.data.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };


  const handleAvailabilityToggle = async () => {
    // Determine new status - simple toggle between available and offline
    const newStatus =
      currentAvailability === "available" ? "offline" : "available";

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

        const statusText =
          newStatus === "available" ? "Available for Work" : "Not Available";
        toast.success(`You are now ${statusText}`);
      } else {
        // Revert on failure
        setCurrentAvailability(
          currentAvailability === "available" ? "offline" : "available"
        );
        toast.error("Failed to update availability");
      }
    } catch (error) {
      // Revert on error
      setCurrentAvailability(
        currentAvailability === "available" ? "offline" : "available"
      );
      console.error("Availability update error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update availability"
      );
    } finally {
      setAvailabilityChanging(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...profileData,
        skills: profileData.skills
          ? profileData.skills.split(",").map((s) => s.trim())
          : [],
      };

      const response = await workerService.updateWorkerProfile(payload);

      if (response.success) {
        updateUser(response.data);
        setEditMode(false);
        toast.success("Profile updated successfully");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleNIDSubmit = async (e) => {
    e.preventDefault();

    if (!nidData.nid_number || !nidData.nid_image_url) {
      toast.error("Please provide NID number and image");
      return;
    }

    try {
      const response = await workerService.submitNIDVerification({
        ...nidData,
        full_name: user?.full_name,
      });

      if (response.success) {
        toast.success("NID verification submitted! Admin will review shortly.");
        setShowNIDModal(false);
        // Refresh user data
        const updatedUser = await api.get("/api/auth/me");
        if (updatedUser.data.success) {
          updateUser(updatedUser.data.data);
        }
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to submit NID verification"
      );
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-blue-100 text-blue-800",
      in_progress: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getAvailabilityBadge = (status) => {
    const badges = {
      available: (
        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800 border-2 border-green-300">
          <span className="w-3 h-3 bg-green-600 rounded-full mr-2 animate-pulse"></span>
          Available Now
        </span>
      ),
      busy: (
        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800 border-2 border-yellow-300">
          <span className="w-3 h-3 bg-yellow-600 rounded-full mr-2"></span>
          Currently Busy
        </span>
      ),
      offline: (
        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 border-2 border-gray-300">
          <span className="w-3 h-3 bg-gray-600 rounded-full mr-2"></span>
          Offline
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

  const isVerified = user?.worker_info?.verification_status === "verified";

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Worker Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {user?.full_name}!</p>
        </div>

        {/* Verification Alert */}
        {user?.worker_info?.verification_status === "pending" && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Your profile is under verification. You'll be able to receive
                  bookings once verified.
                </p>
              </div>
            </div>
          </div>
        )}

        {user?.worker_info?.verification_status === "rejected" && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">❌</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Your verification was rejected. Please resubmit your NID for
                  verification.
                </p>
                <button
                  onClick={() => setShowNIDModal(true)}
                  className="mt-2 text-sm font-medium text-red-700 underline"
                >
                  Resubmit NID
                </button>
              </div>
            </div>
          </div>
        )}

        {!user?.worker_info?.nid_number && (
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">ℹ️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Complete your profile verification to start receiving
                  bookings.
                </p>
                <button
                  onClick={() => setShowNIDModal(true)}
                  className="mt-2 btn-primary text-sm"
                >
                  Submit NID for Verification
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Availability Toggle - SIMPLE & EASY */}
        <div className="mb-6 card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Availability Status
              </h3>
              <p className="text-sm text-gray-600">
                Toggle your availability to let clients know if you're accepting
                work
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
                  currentAvailability === "available"
                    ? "bg-green-600 focus:ring-green-500"
                    : "bg-gray-400 focus:ring-gray-500"
                } ${
                  availabilityChanging
                    ? "opacity-60 cursor-wait"
                    : "hover:shadow-lg cursor-pointer"
                }`}
              >
                <span
                  className={`inline-block h-12 w-12 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                    currentAvailability === "available"
                      ? "translate-x-14"
                      : "translate-x-1"
                  }`}
                >
                  {availabilityChanging && (
                    <span className="flex items-center justify-center h-full">
                      <svg
                        className="animate-spin h-5 w-5 text-gray-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </span>
                  )}
                </span>
                <span
                  className={`absolute text-xs font-bold transition-opacity ${
                    currentAvailability === "available"
                      ? "left-3 text-white"
                      : "right-3 text-white"
                  }`}
                >
                  {currentAvailability === "available" ? "ON" : "OFF"}
                </span>
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                {currentAvailability === "available"
                  ? "✓ Accepting jobs"
                  : "✗ Not accepting jobs"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">Pending Requests</div>
            <div className="text-3xl font-bold text-yellow-600">
              {stats?.pending_bookings || 0}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">Active Jobs</div>
            <div className="text-3xl font-bold text-blue-600">
              {stats?.active_bookings || 0}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">Completed Jobs</div>
            <div className="text-3xl font-bold text-green-600">
              {stats?.total_jobs_completed || 0}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">Total Earnings</div>
            <div className="text-3xl font-bold text-primary-600">
              ৳{stats?.total_earnings?.toLocaleString() || 0}
            </div>
          </div>
        </div>

        {/* Rating Card */}
        <div className="card mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Your Rating
              </h3>
              <div className="flex items-center mt-2">
                <span className="text-3xl font-bold text-yellow-600">
                  {user?.worker_info?.average_rating?.toFixed(1) || "0.0"}
                </span>
                <span className="ml-2 text-2xl text-yellow-400">★</span>
                <span className="ml-2 text-gray-600">
                  ({user?.worker_info?.total_reviews || 0} reviews)
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">This Month</div>
              <div className="text-2xl font-bold text-primary-600">
                {stats?.jobs_this_month || 0}
              </div>
              <div className="text-xs text-gray-500">jobs completed</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Bookings */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Recent Job Requests
                </h2>
                <button
                  onClick={() => navigate("/bookings")}
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  View All →
                </button>
              </div>

              {recentBookings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📋</div>
                  <p className="text-gray-600">No recent bookings</p>
                  {!isVerified && (
                    <p className="text-sm text-gray-500 mt-2">
                      Complete verification to start receiving bookings
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors cursor-pointer"
                      onClick={() => navigate("/bookings")}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900">
                              {booking.user?.full_name}
                            </h3>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(
                                booking.status
                              )}`}
                            >
                              {booking.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {booking.service_description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>📍 {booking.service_location}</span>
                            {booking.estimated_price && (
                              <span className="font-semibold">
                                ৳{booking.estimated_price}
                              </span>
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Profile</h2>
                {!editMode && (
                  <button
                    onClick={() => {
                      setProfileData({
                        bio: user?.worker_profile?.bio || "",
                        hourly_rate: user?.worker_profile?.hourly_rate || "",
                        experience_years:
                          user?.worker_profile?.experience_years || "",
                        skills: user?.worker_profile?.skills?.join(", ") || "",
                        address: user?.address || "",
                      });
                      setEditMode(true);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editMode ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bio
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) =>
                        setProfileData({ ...profileData, bio: e.target.value })
                      }
                      rows={3}
                      className="input-field"
                      placeholder="Tell clients about yourself..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate (৳)
                    </label>
                    <input
                      type="number"
                      value={profileData.hourly_rate}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          hourly_rate: e.target.value,
                        })
                      }
                      className="input-field"
                      placeholder="500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Experience (years)
                    </label>
                    <input
                      type="number"
                      value={profileData.experience_years}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          experience_years: e.target.value,
                        })
                      }
                      className="input-field"
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Skills (comma separated)
                    </label>
                    <input
                      type="text"
                      value={profileData.skills}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          skills: e.target.value,
                        })
                      }
                      className="input-field"
                      placeholder="Electrical wiring, Fixture installation"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary flex-1">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="text-sm font-medium">{user?.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Phone</div>
                    <div className="text-sm font-medium">{user?.phone}</div>
                  </div>
                  {user?.worker_profile?.hourly_rate && (
                    <div>
                      <div className="text-xs text-gray-500">Hourly Rate</div>
                      <div className="text-sm font-medium">
                        ৳{user.worker_profile.hourly_rate}
                      </div>
                    </div>
                  )}
                  {user?.worker_profile?.experience_years > 0 && (
                    <div>
                      <div className="text-xs text-gray-500">Experience</div>
                      <div className="text-sm font-medium">
                        {user.worker_profile.experience_years} years
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/bookings")}
                  className="block w-full btn-primary text-center"
                >
                  View All Jobs
                </button>
                <button
                  onClick={() => navigate("/chat")}
                  className="block w-full btn-secondary text-center"
                >
                  Messages
                </button>
                {!isVerified && (
                  <button
                    onClick={() => setShowNIDModal(true)}
                    className="block w-full btn-secondary text-center"
                  >
                    Submit NID Verification
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NID Verification Modal */}
      <Modal
        isOpen={showNIDModal}
        onClose={() => setShowNIDModal(false)}
        title="Submit NID for Verification"
      >
        <form onSubmit={handleNIDSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NID Number *
            </label>
            <input
              type="text"
              value={nidData.nid_number}
              onChange={(e) =>
                setNidData({ ...nidData, nid_number: e.target.value })
              }
              className="input-field"
              placeholder="Enter your 10/13/17 digit NID number"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your National ID card number (10, 13, or 17 digits)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NID Image URL *
            </label>
            <input
              type="url"
              value={nidData.nid_image_url}
              onChange={(e) =>
                setNidData({ ...nidData, nid_image_url: e.target.value })
              }
              className="input-field"
              placeholder="https://example.com/nid-image.jpg"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload your NID image to a service like Imgur or Cloudinary and
              paste the URL here
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Our AI system will automatically verify
              your NID information. Please ensure the image is clear and all
              text is readable.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowNIDModal(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              Submit for Verification
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WorkerDashboard;
