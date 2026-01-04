import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import Loader from '../common/Loader';
import ProductCard from './ProductCard';

const ShopSection = ({ limit = 4 }) => {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/products?featured=true&limit=${limit}`);
      if (response.data.success) {
        setProducts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Don't show error to user if table doesn't exist yet - just don't show section
      // The table might not be created yet
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    // Refresh products if needed (optional)
    // Could update local state to reflect stock changes
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-sage-50 to-peach-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-sage-50 to-peach-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              🛒 {t('shop.shopHouseholdItems')}
            </h2>
            {products.length > 0 && (
              <Link
                to="/shop"
                className="hidden md:inline-block bg-primary-400 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-500 transition-colors shadow-lg text-sm"
              >
                {t('shop.checkAllItems')} →
              </Link>
            )}
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('shop.everythingYouNeed')}
          </p>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛠️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('shop.productsComingSoon')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('shop.settingUpShop')}
            </p>
            <div className="text-sm text-gray-500">
              <p className="mb-2">{t('shop.toAddProducts')}</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>{t('shop.runDatabaseMigration')}</li>
                <li>{t('shop.addProductsThroughAdmin')}</li>
              </ol>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 flex-1">
                {products.slice(0, 4).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
              
              {/* Right Arrow for "See More" */}
              {products.length > 4 && (
                <div className="hidden md:flex flex-shrink-0 items-center justify-center">
                  <Link
                    to="/shop"
                    className="flex items-center justify-center w-14 h-14 bg-primary-400 text-white rounded-full shadow-lg hover:bg-primary-500 transition-all hover:scale-110 hover:shadow-xl"
                    title={t('shop.viewAllProducts')}
                  >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
            
            {/* "Check All Items" Button - Always visible when products exist */}
            {products.length > 0 && (
              <div className="text-center mt-8">
                <Link
                  to="/shop"
                  className="inline-block bg-primary-400 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-500 transition-colors shadow-lg"
                >
                  {t('shop.checkAllItems')} →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default ShopSection;

