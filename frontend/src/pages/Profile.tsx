// ============================================
// FILE: src/pages/Profile.tsx
// ============================================
import { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Phone, MapPin, Edit2, Save } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Profile() {
  const { user: authUser, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    profilePhoto: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await usersAPI.getProfile();
      setFormData({
        name: profile.name,
        phone: profile.phone || '',
        address: profile.address || '',
        profilePhoto: profile.profilePhoto || '',
      });
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = await usersAPI.updateProfile(formData);
      // Update auth store with new user data
      if (authUser) {
        setAuth({ ...authUser, ...updatedUser }, localStorage.getItem('token') || '');
      }
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="btn-primary flex items-center"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={() => setEditing(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Profile Photo */}
        <div className="flex items-center space-x-6 mb-8">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
            {formData.profilePhoto ? (
              <img
                src={formData.profilePhoto}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <UserIcon className="w-12 h-12 text-gray-400" />
            )}
          </div>
          {editing && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo URL
              </label>
              <input
                type="url"
                className="input-field"
                placeholder="https://example.com/photo.jpg"
                value={formData.profilePhoto}
                onChange={(e) => setFormData({ ...formData, profilePhoto: e.target.value })}
              />
            </div>
          )}
        </div>

        {/* Profile Information */}
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="w-4 h-4 inline mr-2" />
              Full Name
            </label>
            {editing ? (
              <input
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            ) : (
              <p className="text-lg text-gray-900">{formData.name}</p>
            )}
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email Address
            </label>
            <p className="text-lg text-gray-900">{authUser?.email}</p>
            <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone Number
            </label>
            {editing ? (
              <input
                type="tel"
                className="input-field"
                placeholder="01700000000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            ) : (
              <p className="text-lg text-gray-900">{formData.phone || 'Not provided'}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Address
            </label>
            {editing ? (
              <textarea
                className="input-field"
                rows={3}
                placeholder="Enter your address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            ) : (
              <p className="text-lg text-gray-900">{formData.address || 'Not provided'}</p>
            )}
          </div>

          {/* Role Badge */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Type
            </label>
            <span className="inline-block px-4 py-2 bg-primary-100 text-primary-800 rounded-full font-semibold">
              {authUser?.role === 'worker' ? 'Worker Account' : 'Customer Account'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
