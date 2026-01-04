import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Loader from '../common/Loader';
import Modal from '../common/Modal';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name_en: '',
    name_bn: '',
    description_en: '',
    description_bn: '',
    category: 'tools',
    price: '',
    discount_price: '',
    stock_quantity: '0',
    is_featured: false,
    is_available: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Fetch all products from admin endpoint
      const response = await api.get('/api/admin/products');
      if (response.data.success) {
        setProducts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // If endpoint doesn't exist, try the public endpoint
      try {
        const response = await api.get('/api/products?limit=100');
        if (response.data.success) {
          setProducts(response.data.data || []);
        }
      } catch (err) {
        toast.error('Failed to load products');
      }
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
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    if (!formData.name_en || !formData.category || !formData.price) {
      toast.error('Product name (English), category, and price are required');
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name_en', formData.name_en);
      if (formData.name_bn) formDataToSend.append('name_bn', formData.name_bn);
      if (formData.description_en) formDataToSend.append('description_en', formData.description_en);
      if (formData.description_bn) formDataToSend.append('description_bn', formData.description_bn);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('price', parseFloat(formData.price));
      if (formData.discount_price) formDataToSend.append('discount_price', parseFloat(formData.discount_price));
      if (formData.stock_quantity) formDataToSend.append('stock_quantity', parseInt(formData.stock_quantity) || 0);
      formDataToSend.append('is_featured', formData.is_featured);
      formDataToSend.append('is_available', formData.is_available);
      
      // Add image file if provided
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }

      // Don't set Content-Type header manually - let the browser set it with boundary
      const response = await api.post('/api/products', formDataToSend);
      
      if (response.data.success) {
        toast.success('Product added successfully!');
        setShowAddModal(false);
        setFormData({
          name_en: '',
          name_bn: '',
          description_en: '',
          description_bn: '',
          category: 'tools',
          price: '',
          discount_price: '',
          stock_quantity: '0',
          is_featured: false,
          is_available: true
        });
        setImageFile(null);
        setImagePreview(null);
        fetchProducts();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add product');
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    
    if (!formData.name_en || !formData.category || !formData.price) {
      toast.error('Product name (English), category, and price are required');
      return;
    }

    try {
      const formDataToSend = new FormData();
      // Always send ALL fields - required and optional
      formDataToSend.append('name_en', formData.name_en);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('price', parseFloat(formData.price).toString());
      formDataToSend.append('is_featured', formData.is_featured ? 'true' : 'false');
      formDataToSend.append('is_available', formData.is_available !== false ? 'true' : 'false');
      // Optional fields
      formDataToSend.append('name_bn', formData.name_bn || '');
      formDataToSend.append('description_en', formData.description_en || '');
      formDataToSend.append('description_bn', formData.description_bn || '');
      if (formData.discount_price) {
        formDataToSend.append('discount_price', parseFloat(formData.discount_price).toString());
      } else {
        formDataToSend.append('discount_price', '');
      }
      formDataToSend.append('stock_quantity', (formData.stock_quantity !== undefined && formData.stock_quantity !== null) ? parseInt(formData.stock_quantity).toString() : '0');
      
      // Add image file if provided (new upload)
      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }

      // Don't set Content-Type header manually - let the browser set it with boundary
      const response = await api.put(`/api/products/${selectedProduct.id}`, formDataToSend);
      
      if (response.data.success) {
        toast.success('Product updated successfully!');
        setShowEditModal(false);
        setSelectedProduct(null);
        setImageFile(null);
        setImagePreview(null);
        fetchProducts();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update product');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/products/${productId}`);
      if (response.data.success) {
        toast.success('Product deleted successfully!');
        fetchProducts();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleToggleFeatured = async (product) => {
    try {
      const newFeaturedStatus = !(product.is_featured === true);
      const response = await api.put(`/api/products/${product.id}`, {
        is_featured: newFeaturedStatus
      });
      if (response.data.success) {
        toast.success(`Product ${newFeaturedStatus ? 'featured' : 'unfeatured'} successfully!`);
        fetchProducts();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update product');
    }
  };

  const handleToggleAvailable = async (product) => {
    try {
      const newAvailableStatus = !(product.is_available === true);
      const response = await api.put(`/api/products/${product.id}`, {
        is_available: newAvailableStatus
      });
      if (response.data.success) {
        toast.success(`Product ${newAvailableStatus ? 'activated' : 'deactivated'} successfully!`);
        fetchProducts();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update product');
    }
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setFormData({
      name_en: product.name_en || '',
      name_bn: product.name_bn || '',
      description_en: product.description_en || '',
      description_bn: product.description_bn || '',
      category: product.category || 'tools',
      price: product.price || '',
      discount_price: product.discount_price || '',
      stock_quantity: product.stock_quantity || '0',
      is_featured: product.is_featured || false,
      is_available: product.is_available !== false
    });
    setImageFile(null);
    setImagePreview(product.image_url || null);
    setShowEditModal(true);
  };

  const productCategories = ['tools', 'electrical', 'plumbing', 'hardware', 'other'];

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
        <h2 className="text-2xl font-bold text-gray-900">Shop Products</h2>
        <button
          onClick={() => {
            setFormData({
              name_en: '',
              name_bn: '',
              description_en: '',
              description_bn: '',
              category: 'tools',
              price: '',
              discount_price: '',
              stock_quantity: '0',
              is_featured: false,
              is_available: true
            });
            setImageFile(null);
            setImagePreview(null);
            setShowAddModal(true);
          }}
          className="btn-primary"
        >
          + Add New Product
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name (EN)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No products found. Add your first product!
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name_en} className="w-16 h-16 object-cover rounded" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-2xl">🛠️</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.name_en || '-'}</div>
                      {product.name_bn && (
                        <div className="text-sm text-gray-500">{product.name_bn}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {product.category || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {product.discount_price ? (
                          <>
                            <span className="text-red-600 font-bold">৳{parseFloat(product.discount_price).toFixed(2)}</span>
                            <span className="text-gray-400 line-through ml-2">৳{parseFloat(product.price).toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="font-bold">৳{parseFloat(product.price).toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.stock_quantity || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          product.is_available !== false 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {product.is_available !== false ? 'Active' : 'Inactive'}
                        </span>
                        {product.is_featured && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            ⭐ Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-primary-500 hover:text-primary-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleFeatured(product)}
                        className={product.is_featured 
                          ? 'text-orange-600 hover:text-orange-900' 
                          : 'text-yellow-600 hover:text-yellow-900'}
                      >
                        {product.is_featured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button
                        onClick={() => handleToggleAvailable(product)}
                        className={product.is_available !== false 
                          ? 'text-orange-600 hover:text-orange-900' 
                          : 'text-green-600 hover:text-green-900'}
                      >
                        {product.is_available !== false ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
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

      {/* Add Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Product"
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name (English) *
              </label>
              <input
                type="text"
                name="name_en"
                value={formData.name_en}
                onChange={handleInputChange}
                className="input-field"
                placeholder="e.g., Hammer"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name (Bangla)
              </label>
              <input
                type="text"
                name="name_bn"
                value={formData.name_bn}
                onChange={handleInputChange}
                className="input-field"
                placeholder="e.g., হাতুড়ি"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="input-field"
              required
            >
              {productCategories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (BDT) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="input-field"
                placeholder="500.00"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Price (BDT)
              </label>
              <input
                type="number"
                name="discount_price"
                value={formData.discount_price}
                onChange={handleInputChange}
                className="input-field"
                placeholder="450.00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Quantity
            </label>
            <input
              type="number"
              name="stock_quantity"
              value={formData.stock_quantity}
              onChange={handleInputChange}
              className="input-field"
              placeholder="50"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Image
            </label>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              className="input-field"
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove Image
                </button>
              </div>
            )}
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
              placeholder="Product description in English"
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
              placeholder="Product description in Bangla"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_featured"
                checked={formData.is_featured}
                onChange={handleInputChange}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Featured Product</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_available"
                checked={formData.is_available}
                onChange={handleInputChange}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Available</span>
            </label>
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
              Add Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProduct(null);
        }}
        title="Edit Product"
      >
        <form onSubmit={handleEditProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name (English) *
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
                Product Name (Bangla)
              </label>
              <input
                type="text"
                name="name_bn"
                value={formData.name_bn}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="input-field"
              required
            >
              {productCategories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (BDT) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="input-field"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Price (BDT)
              </label>
              <input
                type="number"
                name="discount_price"
                value={formData.discount_price}
                onChange={handleInputChange}
                className="input-field"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Quantity
            </label>
            <input
              type="number"
              name="stock_quantity"
              value={formData.stock_quantity}
              onChange={handleInputChange}
              className="input-field"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Image
            </label>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              className="input-field"
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded border border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Remove Image
                </button>
              </div>
            )}
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

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_featured"
                checked={formData.is_featured}
                onChange={handleInputChange}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Featured Product</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_available"
                checked={formData.is_available}
                onChange={handleInputChange}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Available</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedProduct(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-400 rounded-lg hover:bg-primary-500"
            >
              Update Product
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductManagement;

