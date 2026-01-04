import React, { useState, useEffect } from 'react';
import blogService from '../../services/blogService';
import api from '../../services/api';
import { toast } from 'react-toastify';
import Loader from '../common/Loader';
import Modal from '../common/Modal';

const BlogManagement = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [formData, setFormData] = useState({
    title_en: '',
    title_bn: '',
    content_en: '',
    content_bn: '',
    category: '',
    featured_image: '',
    is_published: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const response = await blogService.getBlogs({ limit: 100 });
      if (response.success) {
        setBlogs(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title_en || !formData.content_en) {
      toast.error('Title and content (English) are required');
      return;
    }

    try {
      setUploading(true);
      const submitData = { ...formData };

      // If there's a new image file, upload it
      if (imageFile) {
        const formDataToSend = new FormData();
        formDataToSend.append('featured_image', imageFile);
        formDataToSend.append('title_en', formData.title_en);
        formDataToSend.append('title_bn', formData.title_bn || '');
        formDataToSend.append('content_en', formData.content_en);
        formDataToSend.append('content_bn', formData.content_bn || '');
        formDataToSend.append('category', formData.category || '');
        formDataToSend.append('is_published', formData.is_published);

        if (editingBlog) {
          // Update with image
          const response = await api.put(`/api/blogs/${editingBlog.id}`, formDataToSend, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (response.data.success) {
            toast.success('Blog updated successfully');
            fetchBlogs();
            resetForm();
          }
        } else {
          // Create with image
          const response = await api.post('/api/blogs', formDataToSend, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (response.data.success) {
            toast.success('Blog created successfully');
            fetchBlogs();
            resetForm();
          }
        }
      } else {
        // No new image, use existing or URL
        if (editingBlog) {
          const response = await blogService.updateBlog(editingBlog.id, submitData);
          if (response.success) {
            toast.success('Blog updated successfully');
            fetchBlogs();
            resetForm();
          }
        } else {
          const response = await blogService.createBlog(submitData);
          if (response.success) {
            toast.success('Blog created successfully');
            fetchBlogs();
            resetForm();
          }
        }
      }
    } catch (error) {
      console.error('Error saving blog:', error);
      toast.error(error.response?.data?.message || 'Failed to save blog');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (blog) => {
    setEditingBlog(blog);
    setFormData({
      title_en: blog.title_en || '',
      title_bn: blog.title_bn || '',
      content_en: blog.content_en || '',
      content_bn: blog.content_bn || '',
      category: blog.category || '',
      featured_image: blog.featured_image || '',
      is_published: blog.is_published !== undefined ? blog.is_published : true
    });
    setImagePreview(blog.featured_image || null);
    setImageFile(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) {
      return;
    }

    try {
      const response = await blogService.deleteBlog(id);
      if (response.success) {
        toast.success('Blog deleted successfully');
        fetchBlogs();
      }
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error('Failed to delete blog');
    }
  };

  const resetForm = () => {
    setFormData({
      title_en: '',
      title_bn: '',
      content_en: '',
      content_bn: '',
      category: '',
      featured_image: '',
      is_published: true
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingBlog(null);
    setShowModal(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Blog Management</h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary"
        >
          + Create New Blog
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Views</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {blogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No blog posts found. Create your first blog post!
                  </td>
                </tr>
              ) : (
                blogs.map((blog) => (
                  <tr key={blog.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {blog.featured_image ? (
                        <img
                          src={blog.featured_image}
                          alt={blog.title_en}
                          className="h-16 w-24 object-cover rounded"
                        />
                      ) : (
                        <div className="h-16 w-24 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-2xl">📰</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 line-clamp-2 max-w-xs">
                        {blog.title_en}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{blog.category || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">👁️ {blog.views || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        blog.is_published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {blog.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(blog.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(blog)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(blog.id)}
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (English) *
            </label>
            <input
              type="text"
              name="title_en"
              value={formData.title_en}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (Bengali)
            </label>
            <input
              type="text"
              name="title_bn"
              value={formData.title_bn}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content (English) *
            </label>
            <textarea
              name="content_en"
              value={formData.content_en}
              onChange={handleInputChange}
              rows="8"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content (Bengali)
            </label>
            <textarea
              name="content_bn"
              value={formData.content_bn}
              onChange={handleInputChange}
              rows="8"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              placeholder="e.g., Home Maintenance, Tips & Guides"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Featured Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-48 w-full object-cover rounded-md"
                />
              </div>
            )}
            {!imageFile && formData.featured_image && (
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1">Current image:</p>
                <img
                  src={formData.featured_image}
                  alt="Current"
                  className="h-48 w-full object-cover rounded-md"
                />
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_published"
              checked={formData.is_published}
              onChange={handleInputChange}
              className="rounded"
            />
            <label className="ml-2 text-sm text-gray-700">
              Publish immediately
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="btn-primary"
            >
              {uploading ? 'Saving...' : editingBlog ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BlogManagement;

