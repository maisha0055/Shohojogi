import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import Loader from '../components/common/Loader';
import ProductCard from '../components/shop/ProductCard';
import OrderHistory from '../components/shop/OrderHistory';

const Shop = () => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || ''
  });

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    if (isAuthenticated) {
      fetchCartCount();
    }
  }, [filters, isAuthenticated]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/products/categories');
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.min_price) params.append('min_price', filters.min_price);
      if (filters.max_price) params.append('max_price', filters.max_price);
      params.append('limit', '100');

      const response = await api.get(`/api/products?${params.toString()}`);
      if (response.data.success) {
        setProducts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCartCount = async () => {
    try {
      const response = await api.get('/api/cart');
      if (response.data.success) {
        setCartCount(response.data.data.item_count || 0);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
      setCartCount(0);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const handleAddToCart = () => {
    // Refresh cart count when item is added
    if (isAuthenticated) {
      fetchCartCount();
    }
  };

  const [activeTab, setActiveTab] = useState('products');

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-peach-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            🛒 {t('shop.shop')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('shop.browseSelection')}
          </p>
          
          {/* Cart Button */}
          {isAuthenticated && (
            <div className="absolute top-0 right-0">
              <Link
                to="/shop-cart"
                className="relative inline-flex items-center px-4 py-2 bg-primary-400 text-white rounded-lg hover:bg-primary-500 transition-colors shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{t('common.cart')}</span>
                {cartCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            </div>
          )}
        </div>

        {/* Tabs */}
        {isAuthenticated && (
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('products')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'products'
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('shop.products')}
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('shop.myOrders')}
              </button>
            </nav>
          </div>
        )}

        {/* Orders Tab */}
        {isAuthenticated && activeTab === 'orders' && (
          <div className="mb-8">
            <OrderHistory />
          </div>
        )}

        {/* Products Tab */}
        {(activeTab === 'products' || !isAuthenticated) && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('common.search')}
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder={t('shop.searchProducts')}
                className="input-field"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('shop.category')}
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="input-field"
              >
                <option value="">{t('shop.allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)} ({cat.product_count})
                  </option>
                ))}
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('shop.minPrice')} (৳)
              </label>
              <input
                type="number"
                value={filters.min_price}
                onChange={(e) => handleFilterChange('min_price', e.target.value)}
                placeholder="0"
                className="input-field"
                min="0"
              />
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('shop.maxPrice')} (৳)
              </label>
              <input
                type="number"
                value={filters.max_price}
                onChange={(e) => handleFilterChange('max_price', e.target.value)}
                placeholder="10000"
                className="input-field"
                min="0"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {(filters.category || filters.search || filters.min_price || filters.max_price) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setFilters({ category: '', search: '', min_price: '', max_price: '' });
                  setSearchParams({});
                }}
                className="text-primary-500 hover:text-primary-600 text-sm font-medium"
              >
                {t('common.reset')}
              </button>
            </div>
          )}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="text-6xl mb-4">🛠️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No products found
            </h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or check back later
            </p>
            <button
              onClick={() => {
                setFilters({ category: '', search: '', min_price: '', max_price: '' });
                setSearchParams({});
              }}
              className="btn-primary"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 text-gray-600">
              Showing {products.length} product(s)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default Shop;

