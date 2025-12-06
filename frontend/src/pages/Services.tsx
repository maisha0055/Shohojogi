// ============================================
// FILE: src/pages/Services.tsx
// ============================================
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { servicesAPI } from '../services/api';
import type { Service } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await servicesAPI.getAll();
      setServices(data);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedServices = async () => {
    try {
      await servicesAPI.seed();
      toast.success('Services seeded successfully!');
      loadServices();
    } catch (error) {
      toast.error('Failed to seed services');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Our Services
          </h1>
          <p className="text-gray-600 text-lg">
            Choose from our wide range of professional services
          </p>
        </div>
        {services.length === 0 && (
          <button onClick={handleSeedServices} className="btn-primary">
            Seed Services
          </button>
        )}
      </div>

      {services.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">No services available yet.</p>
          <button onClick={handleSeedServices} className="btn-primary">
            Add Default Services
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Link
              key={service.id}
              to={`/search-workers?skills=${service.name}`}
              className="card hover:shadow-xl transition-shadow"
            >
              <div className="text-5xl mb-4">🔧</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                {service.name}
              </h3>
              <p className="text-gray-600 mb-4">{service.description}</p>
              <span className="text-primary-600 font-semibold hover:text-primary-700">
                Find {service.name}s →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
