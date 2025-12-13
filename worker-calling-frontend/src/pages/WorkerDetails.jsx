import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import workerService from '../services/workerService';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import { toast } from 'react-toastify';

const WorkerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchWorkerDetails();
    if (isAuthenticated && user?.role === 'user') {
      checkIfFavorite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchWorkerDetails = async () => {
    try {
      const response = await workerService.getWorkerById(id);
      if (response.success) {
        setWorker(response.data);
      }
    } catch (error) {
      console.error('Error fetching worker:', error);
      toast.error('Failed to load worker details');
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    try {
      const response = await api.get('/api/users/favorites');
      if (response.data.success) {
        const favorites = response.data.data;
        setIsFavorite(favorites.some(fav => fav.id === id));
      }
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast.info('Please login to add favorites');
      navigate('/login');
      return;
    }

    try {
      if (isFavorite) {
        await api.delete(`/api/users/favorites/${id}`);
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await api.post(`/api/users/favorites/${id}`);
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      toast.info('Please login to book a worker');
      navigate('/login');
      return;
    }

    if (user?.role !== 'user') {
      toast.error('Only users can book workers');
      return;
    }

    navigate(`/booking/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Worker not found
          </h2>
          <button onClick={() => navigate('/workers')} className="btn-primary">
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/workers')}
          className="mb-6 text-primary-600 hover:text-primary-700 flex items-center"
        >
          ← Back to Search
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Worker Info Card */}
            <div className="card">
              <div className="flex items-start space-x-6">
                {worker.profile_photo ? (
                  <img
                    src={worker.profile_photo}
                    alt={worker.full_name}
                    className="w-32 h-32 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary-600">
                      {worker.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">
                        {worker.full_name}
                      </h1>
                      <p className="text-lg text-gray-600 mt-1">
                        {worker.service_category_name}
                      </p>
                    </div>
                    <button
                      onClick={handleToggleFavorite}
                      className={`p-2 rounded-full ${
                        isFavorite
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                      } hover:bg-opacity-80`}
                    >
                      <span className="text-2xl">
                        {isFavorite ? '❤️' : '🤍'}
                      </span>
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    {/* Rating */}
                    <div className="flex items-center">
                      <span className="text-yellow-400 text-xl">★</span>
                      <span className="ml-1 text-lg font-semibold">
                        {worker.average_rating ? parseFloat(worker.average_rating).toFixed(1) : '0.0'}
                      </span>
                      <span className="ml-1 text-gray-600">
                        ({worker.total_reviews} reviews)
                      </span>
                    </div>

                    {/* Jobs */}
                    <div className="text-gray-600">
                      {worker.total_jobs_completed} jobs completed
                    </div>

                    {/* Verification */}
                    {worker.verification_status === 'verified' && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  {/* Experience & Rate */}
                  <div className="mt-4 flex flex-wrap gap-4">
                    {worker.experience_years > 0 && (
                      <div className="text-gray-700">
                        <span className="font-semibold">Experience:</span>{' '}
                        {worker.experience_years} years
                      </div>
                    )}
                    {worker.hourly_rate && (
                      <div className="text-gray-700">
                        <span className="font-semibold">Rate:</span>{' '}
                        <span className="text-primary-600 font-bold">
                          ৳{worker.hourly_rate}/hour
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Availability */}
                  <div className="mt-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        worker.availability_status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {worker.availability_status === 'available'
                        ? '● Available Now'
                        : '● Currently Busy'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* About */}
            {worker.bio && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed">{worker.bio}</p>
              </div>
            )}

            {/* Skills */}
            {worker.skills && worker.skills.length > 0 && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {worker.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Reviews ({worker.total_reviews})
              </h2>

              {worker.recent_reviews && worker.recent_reviews.length > 0 ? (
                <div className="space-y-4">
                  {worker.recent_reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {review.user_photo ? (
                            <img
                              src={review.user_photo}
                              alt={review.user_name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-600 font-semibold">
                                {review.user_name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">
                              {review.user_name}
                            </h4>
                            <div className="flex items-center">
                              <span className="text-yellow-400">★</span>
                              <span className="ml-1 font-semibold">
                                {review.rating}
                              </span>
                            </div>
                          </div>
                          {review.comment && (
                            <p className="mt-2 text-gray-700">{review.comment}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No reviews yet</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card sticky top-20">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Book This Worker
              </h3>

              {worker.hourly_rate && (
                <div className="mb-4">
                  <div className="text-3xl font-bold text-primary-600">
                    ৳{worker.hourly_rate}
                  </div>
                  <div className="text-gray-600">per hour</div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleBookNow}
                  disabled={worker.availability_status !== 'available'}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {worker.availability_status === 'available'
                    ? 'Book Now'
                    : 'Currently Unavailable'}
                </button>

                {isAuthenticated && user?.role === 'user' && (
                  <button
                    onClick={() => navigate(`/chat?user=${id}`)}
                    className="w-full btn-secondary"
                  >
                    Send Message
                  </button>
                )}
              </div>

              {/* Contact Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Contact Information
                </h4>
                <div className="space-y-2 text-sm">
                  {worker.phone && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">📱</span>
                      {worker.phone}
                    </div>
                  )}
                  {worker.email && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">📧</span>
                      {worker.email}
                    </div>
                  )}
                  {worker.address && (
                    <div className="flex items-start text-gray-700">
                      <span className="mr-2">📍</span>
                      <span>{worker.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDetails;