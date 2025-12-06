// ============================================
// FILE: src/pages/SearchWorkers.tsx
// ============================================
import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { workersAPI, servicesAPI } from '../services/api';
import type { Worker, Service } from '../types';
import WorkerCard from '../components/WorkerCard';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function SearchWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    skills: [] as string[],
    minRating: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workersData, servicesData] = await Promise.all([
        workersAPI.getAll(),
        servicesAPI.getAll(),
      ]);
      setWorkers(workersData);
      setServices(servicesData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const searchParams = {
        location: filters.location || undefined,
        skills: filters.skills.length > 0 ? filters.skills : undefined,
        minRating: filters.minRating > 0 ? filters.minRating : undefined,
      };
      const data = await workersAPI.search(searchParams);
      setWorkers(data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSkillToggle = (skill: string) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Find Workers</h1>

      {/* Search and Filter Bar */}
      <div className="card mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Location Search */}
          <div className="flex-1">
            <input
              type="text"
              className="input-field"
              placeholder="Search by location (e.g., Dhaka, Gulshan)"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
            <button onClick={handleSearch} className="btn-primary flex items-center">
              <Search className="w-4 h-4 mr-2" />
              Search
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            {/* Skills Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Filter by Skills
              </label>
              <div className="flex flex-wrap gap-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleSkillToggle(service.name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      filters.skills.includes(service.name)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {service.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Minimum Rating
              </label>
              <div className="flex gap-2">
                {[0, 3, 4, 4.5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setFilters({ ...filters, minRating: rating })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filters.minRating === rating
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {rating === 0 ? 'Any' : `${rating}+ ⭐`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {workers.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 text-lg">No workers found.</p>
          <p className="text-gray-500 mt-2">Try adjusting your search filters.</p>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-6">
            Found {workers.length} worker{workers.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-6">
            {workers.map((worker) => (
              <WorkerCard key={worker.id} worker={worker} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}