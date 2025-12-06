// ============================================
// FILE: src/components/WorkerCard.tsx
// ============================================
import { MapPin, Star, Phone } from 'lucide-react';
import type { Worker } from '../types';
import { Link } from 'react-router-dom';

interface WorkerCardProps {
  worker: Worker;
}

export default function WorkerCard({ worker }: WorkerCardProps) {
  return (
    <div className="card hover:shadow-xl transition-shadow">
      <div className="flex items-start space-x-4">
        {/* Profile Photo */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            {worker.user.profilePhoto ? (
              <img
                src={worker.user.profilePhoto}
                alt={worker.user.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-gray-500">
                {worker.user.name.charAt(0)}
              </span>
            )}
          </div>
        </div>

        {/* Worker Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {worker.user.name}
              </h3>
              <div className="flex items-center mt-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="ml-1 text-sm text-gray-600">
                  {worker.rating.toFixed(1)} ({worker.totalReviews} reviews)
                </span>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                worker.isAvailable
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {worker.isAvailable ? 'Available' : 'Busy'}
            </span>
          </div>

          {/* Skills */}
          <div className="mt-3 flex flex-wrap gap-2">
            {worker.skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Location */}
          {worker.location && (
            <div className="mt-3 flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="text-sm">{worker.location}</span>
            </div>
          )}

          {/* Bio */}
          {worker.bio && (
            <p className="mt-3 text-gray-600 text-sm line-clamp-2">{worker.bio}</p>
          )}

          {/* Actions */}
          <div className="mt-4 flex space-x-3">
            <Link
              to={`/workers/${worker.id}`}
              className="btn-primary text-sm"
            >
              View Profile
            </Link>
            {worker.user.phone && (
              <a
                href={`tel:${worker.user.phone}`}
                className="btn-secondary text-sm flex items-center"
              >
                <Phone className="w-4 h-4 mr-1" />
                Call
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}