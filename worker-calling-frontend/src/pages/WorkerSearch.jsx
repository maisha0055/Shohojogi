import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import workerService from '../services/workerService';
import api from '../services/api';
import Loader from '../components/common/Loader';

const WorkerSearch = () => {
  const [workers, setWorkers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    service_category_id: '',
    availability_status: '',
    min_rating: '',
    search: '',
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchCategories();
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl) {
      setFilters(prev => ({ ...prev, service_category_id: categoryFromUrl }));
    }
  }, [searchParams]);

  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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
      const response = await workerService.getWorkers(filters);
      if (response.success) {
        setWorkers(response.data.workers);
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
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

  const handleSearch = (e) => {
    e.preventDefault();
    fetchWorkers();
  };

  const clearFilters = () => {
    setFilters({
      service_category_id: '',
      availability_status: '',
      min_rating: '',
      search: '',
    });
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find Workers</h1>
          <p className="mt-2 text-gray-600">
            Search and hire verified professional workers near you
          </p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search by name or skill..."
                  className="input-field"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Category
                </label>
                <select
                  name="service_category_id"
                  value={filters.service_category_id}
                  onChange={handleFilterChange}
                  className="input-field"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Availability
                </label>
                <select
                  name="availability_status"
                  value={filters.availability_status}
                  onChange={handleFilterChange}
                  className="input-field"
                >
                  <option value="">All</option>
                  <option value="available">Available Now</option>
                  <option value="busy">Busy</option>
                </select>
              </div>

              {/* Minimum Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Rating
                </label>
                <select
                  name="min_rating"
                  value={filters.min_rating}
                  onChange={handleFilterChange}
                  className="input-field"
                >
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="5">5 Stars</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                Apply Filters
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No workers found
            </h3>
            <p className="text-gray-600">
              Try adjusting your filters or search criteria
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Found {workers.length} worker{workers.length !== 1 ? 's' : ''}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workers.map((worker) => (
                <div
                  key={worker.id}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/workers/${worker.id}`)}
                >
                  {/* Worker Card */}
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {worker.profile_photo ? (
                        <img
                          src={worker.profile_photo}
                          alt={worker.full_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-2xl font-bold text-primary-600">
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
                          <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
                            Featured
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center space-x-4">
                        {/* Rating */}
                        <div className="flex items-center">
                          <span className="text-yellow-400">★</span>
                          <span className="ml-1 text-sm font-medium">
                            {worker.average_rating ? parseFloat(worker.average_rating).toFixed(1) : '0.0'}
                          </span>
                          <span className="ml-1 text-xs text-gray-500">
                            ({worker.total_reviews || 0})
                          </span>
                        </div>

                        {/* Jobs Completed */}
                        <div className="text-sm text-gray-600">
                          {worker.total_jobs_completed} jobs
                        </div>
                      </div>

                      {/* Experience */}
                      {worker.experience_years > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          {worker.experience_years} years experience
                        </div>
                      )}

                      {/* Bio */}
                      {worker.bio && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {worker.bio}
                        </p>
                      )}

                      {/* Hourly Rate */}
                      {worker.hourly_rate && (
                        <div className="mt-3 text-lg font-semibold text-primary-600">
                          ৳{parseFloat(worker.hourly_rate).toFixed(0)}/hour
                        </div>
                      )}

                      {/* Availability Status */}
                      <div className="mt-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            worker.availability_status === 'available'
                              ? 'bg-green-100 text-green-800'
                              : worker.availability_status === 'busy'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {worker.availability_status === 'available'
                            ? '● Available Now'
                            : worker.availability_status === 'busy'
                            ? '● Busy'
                            : '● Offline'}
                        </span>
                      </div>

                      {/* Location */}
                      {worker.address && (
                        <div className="mt-2 text-xs text-gray-500 flex items-center">
                          <span>📍</span>
                          <span className="ml-1">{worker.address}</span>
                        </div>
                      )}

                      {/* Distance */}
                      {worker.distance_km && (
                        <div className="mt-1 text-xs text-gray-500">
                          {parseFloat(worker.distance_km).toFixed(1)} km away
                        </div>
                      )}
                    </div>
                  </div>

                  {/* View Profile Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button className="w-full btn-primary text-sm">
                      View Profile & Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkerSearch;