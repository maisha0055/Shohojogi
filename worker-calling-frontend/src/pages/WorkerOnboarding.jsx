import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import workerService from '../services/workerService';
import authService from '../services/authService';
import api from '../services/api';
import Loader from '../components/common/Loader';
import { toast } from 'react-toastify';

const WorkerOnboarding = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    service_category_id: '',
    bio: '',
    hourly_rate: '',
    experience_years: '',
    skills: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // Don't check redirect during submission
    if (submitting) {
      return;
    }
    
    // Check if profile is already complete
    // Check both worker_info and worker_profile for compatibility
    const hasCategory = user?.worker_info?.service_category_id || user?.worker_profile?.service_category_id;
    if (hasCategory) {
      navigate('/worker-dashboard');
    }
  }, [user, navigate, submitting]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.service_category_id) {
      toast.error('Please select a service category');
      return;
    }

    if (!formData.bio || formData.bio.trim().length < 10) {
      toast.error('Please provide a bio (at least 10 characters)');
      return;
    }

    if (!formData.hourly_rate || parseFloat(formData.hourly_rate) <= 0) {
      toast.error('Please enter a valid hourly rate');
      return;
    }

    if (!formData.experience_years || parseInt(formData.experience_years) < 0) {
      toast.error('Please enter valid experience years');
      return;
    }

    if (!formData.skills || formData.skills.trim().length === 0) {
      toast.error('Please enter your skills');
      return;
    }

    setSubmitting(true);
    try {
      // Convert skills string to array
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
      
      const payload = {
        service_category_id: formData.service_category_id,
        bio: formData.bio.trim(),
        hourly_rate: parseFloat(formData.hourly_rate),
        experience_years: parseInt(formData.experience_years),
        skills: skillsArray,
      };

      const response = await workerService.updateWorkerProfile(payload);
      
      if (response.success) {
        // Fetch full user data with properly structured worker_profile
        const fullUserResponse = await authService.getCurrentUser();
        if (fullUserResponse.success) {
          updateUser(fullUserResponse.data);
          toast.success('Profile saved successfully! Please complete NID verification to activate your account.');
          navigate('/worker-dashboard');
        } else {
          // Fallback: use response data if getCurrentUser fails
          updateUser(response.data);
          toast.success('Profile setup complete!');
          navigate('/worker-dashboard');
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Your Profile
            </h1>
            <p className="text-gray-600">
              Please fill in your professional information. After completing your profile, you'll need to verify your NID to activate your account and start receiving job requests.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Category *
              </label>
              <select
                name="service_category_id"
                value={formData.service_category_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {(categories || []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name || category.name_en} {category.name_bn && `(${category.name_bn})`}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose the category that best matches your skills
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio *
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                required
                minLength={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Tell clients about yourself, your experience, and what services you offer..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum 10 characters. Describe your skills and experience.
              </p>
            </div>

            {/* Hourly Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate (৳) *
              </label>
              <input
                type="number"
                name="hourly_rate"
                value={formData.hourly_rate}
                onChange={handleChange}
                required
                min="1"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Your hourly rate in Bangladeshi Taka (৳)
              </p>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Years of Experience *
              </label>
              <input
                type="number"
                name="experience_years"
                value={formData.experience_years}
                onChange={handleChange}
                required
                min="0"
                max="50"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="5"
              />
              <p className="mt-1 text-xs text-gray-500">
                Number of years you've been working in this field
              </p>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills *
              </label>
              <input
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Electrical wiring, Fixture installation, Troubleshooting"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter your skills separated by commas
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Complete Profile & Continue'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkerOnboarding;

