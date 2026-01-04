import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Loader from '../common/Loader';
import Modal from '../common/Modal';

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    name_en: '',
    name_bn: '',
    description_en: '',
    description_bn: '',
    icon_url: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Fetch all categories (including inactive ones) from admin endpoint
      const response = await api.get('/api/admin/categories');
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    
    if (!formData.name_en || !formData.name_bn) {
      toast.error('Category name in both English and Bangla is required');
      return;
    }

    try {
      const response = await api.post('/api/categories', formData);
      if (response.data.success) {
        toast.success('Category added successfully!');
        setShowAddModal(false);
        setFormData({
          name_en: '',
          name_bn: '',
          description_en: '',
          description_bn: '',
          icon_url: ''
        });
        fetchCategories();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add category');
    }
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    
    if (!formData.name_en || !formData.name_bn) {
      toast.error('Category name in both English and Bangla is required');
      return;
    }

    try {
      const response = await api.put(`/api/categories/${selectedCategory.id}`, formData);
      if (response.data.success) {
        toast.success('Category updated successfully!');
        setShowEditModal(false);
        setSelectedCategory(null);
        fetchCategories();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/categories/${categoryId}`);
      if (response.data.success) {
        toast.success('Category deleted successfully!');
        fetchCategories();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleToggleActive = async (category) => {
    try {
      const response = await api.put(`/api/categories/${category.id}`, {
        is_active: !category.is_active
      });
      if (response.data.success) {
        toast.success(`Category ${!category.is_active ? 'activated' : 'deactivated'} successfully!`);
        fetchCategories();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update category status');
    }
  };

  const openEditModal = (category) => {
    setSelectedCategory(category);
    setFormData({
      name_en: category.name_en || '',
      name_bn: category.name_bn || '',
      description_en: category.description_en || '',
      description_bn: category.description_bn || '',
      icon_url: category.icon_url || ''
    });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Service Categories</h2>
        <button
          onClick={() => {
            setFormData({
              name_en: '',
              name_bn: '',
              description_en: '',
              description_bn: '',
              icon_url: ''
            });
            setShowAddModal(true);
          }}
          className="btn-primary"
        >
          + Add New Category
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name (EN)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name (BN)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No categories found. Add your first category!
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {category.name_en || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {category.name_bn || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {category.description_en || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        category.is_active !== false 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {category.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => openEditModal(category)}
                        className="text-primary-500 hover:text-primary-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(category)}
                        className={category.is_active !== false 
                          ? 'text-orange-600 hover:text-orange-900' 
                          : 'text-green-600 hover:text-green-900'}
                      >
                        {category.is_active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Category Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Category"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name (English) *
            </label>
            <input
              type="text"
              name="name_en"
              value={formData.name_en}
              onChange={handleInputChange}
              className="input-field"
              placeholder="e.g., Driver"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name (Bangla) *
            </label>
            <input
              type="text"
              name="name_bn"
              value={formData.name_bn}
              onChange={handleInputChange}
              className="input-field"
              placeholder="e.g., ড্রাইভার"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (English)
            </label>
            <textarea
              name="description_en"
              value={formData.description_en}
              onChange={handleInputChange}
              className="input-field"
              rows="3"
              placeholder="Brief description of this service category"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Bangla)
            </label>
            <textarea
              name="description_bn"
              value={formData.description_bn}
              onChange={handleInputChange}
              className="input-field"
              rows="3"
              placeholder="এই পরিষেবা বিভাগের সংক্ষিপ্ত বিবরণ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Icon URL (Optional)
            </label>
            <input
              type="text"
              name="icon_url"
              value={formData.icon_url}
              onChange={handleInputChange}
              className="input-field"
              placeholder="https://example.com/icon.png"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-400 rounded-lg hover:bg-primary-500"
            >
              Add Category
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCategory(null);
        }}
        title="Edit Category"
      >
        <form onSubmit={handleEditCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name (English) *
            </label>
            <input
              type="text"
              name="name_en"
              value={formData.name_en}
              onChange={handleInputChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name (Bangla) *
            </label>
            <input
              type="text"
              name="name_bn"
              value={formData.name_bn}
              onChange={handleInputChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (English)
            </label>
            <textarea
              name="description_en"
              value={formData.description_en}
              onChange={handleInputChange}
              className="input-field"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Bangla)
            </label>
            <textarea
              name="description_bn"
              value={formData.description_bn}
              onChange={handleInputChange}
              className="input-field"
              rows="3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Icon URL (Optional)
            </label>
            <input
              type="text"
              name="icon_url"
              value={formData.icon_url}
              onChange={handleInputChange}
              className="input-field"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedCategory(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-400 rounded-lg hover:bg-primary-500"
            >
              Update Category
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CategoryManagement;

