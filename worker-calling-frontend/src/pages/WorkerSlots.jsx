import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import Loader from '../components/common/Loader';
import { toast } from 'react-toastify';

const WorkerSlots = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSlot, setNewSlot] = useState({
    slot_date: '',
    start_time: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/workers/slots');
      if (response.data.success) {
        setSlots(response.data.data || []);
      } else {
        toast.error(response.data.message || 'Failed to load slots');
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load slots';
      if (error.response?.status === 404) {
        toast.error('Route not found. Please check if the backend server is running.');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Please log in as a worker to manage slots');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    
    if (!newSlot.slot_date || !newSlot.start_time) {
      toast.error('Please select date and time');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/api/workers/slots', newSlot);
      if (response.data.success) {
        toast.success(t('worker.slotCreated'));
        setShowCreateModal(false);
        setNewSlot({ slot_date: '', start_time: '' });
        fetchSlots();
      }
    } catch (error) {
      console.error('Error creating slot:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create slot';
      if (error.response?.status === 404) {
        toast.error('Route not found. Please check if the backend server is running.');
      } else if (error.response?.status === 400) {
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (slotId, status) => {
    try {
      const response = await api.put(`/api/workers/slots/${slotId}`, { status });
      if (response.data.success) {
        toast.success(t('worker.slotUpdated'));
        fetchSlots();
      }
    } catch (error) {
      console.error('Error updating slot:', error);
      toast.error(error.response?.data?.message || 'Failed to update slot');
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this slot?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/workers/slots/${slotId}`);
      if (response.data.success) {
        toast.success(t('worker.slotDeleted'));
        fetchSlots();
      }
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error(error.response?.data?.message || 'Failed to delete slot');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">{t('worker.slotActive')}</span>,
      busy: <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">{t('worker.slotBusy')}</span>,
      booked: <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">{t('worker.slotBooked')}</span>
    };
    return badges[status] || badges.active;
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateEndTime = (startTime) => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = (hours + 2) % 24;
    return `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-6 text-primary-600 hover:text-primary-700"
        >
          ← {t('common.back')} to Dashboard
        </button>

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{t('worker.manageSlots')}</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              ➕ {t('worker.createSlot')}
            </button>
          </div>

          {slots.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-gray-600 text-lg mb-4">{t('worker.noSlots')}</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                {t('worker.createSlot')}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('worker.slotDate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('worker.slotTime')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('worker.slotDuration')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('worker.slotStatus')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {slots.map((slot) => (
                    <tr key={slot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(slot.slot_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {t('worker.slotDuration')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(slot.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {slot.status !== 'booked' && (
                          <>
                            {slot.status === 'active' ? (
                              <button
                                onClick={() => handleUpdateStatus(slot.id, 'busy')}
                                className="text-yellow-600 hover:text-yellow-900"
                              >
                                {t('worker.setBusy')}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(slot.id, 'active')}
                                className="text-green-600 hover:text-green-900"
                              >
                                {t('worker.setActive')}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              {t('worker.deleteSlot')}
                            </button>
                          </>
                        )}
                        {slot.status === 'booked' && (
                          <span className="text-gray-400 text-xs">Cannot modify booked slot</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Slot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">{t('worker.createSlot')}</h2>
            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('worker.slotDate')} *
                </label>
                <input
                  type="date"
                  value={newSlot.slot_date}
                  onChange={(e) => setNewSlot({ ...newSlot, slot_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('worker.slotTime')} *
                </label>
                <input
                  type="time"
                  value={newSlot.start_time}
                  onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{t('worker.slotDuration')}</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewSlot({ slot_date: '', start_time: '' });
                  }}
                  className="flex-1 btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {submitting ? t('common.loading') : t('worker.createSlot')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerSlots;

