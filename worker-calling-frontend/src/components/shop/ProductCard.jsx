import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'react-toastify';

const ProductCard = ({ product, onAddToCart }) => {
  const { isAuthenticated } = useAuth();

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please login to add items to cart');
      return;
    }

    try {
      await api.post('/api/cart', {
        product_id: product.id,
        quantity: 1
      });
      toast.success('Added to cart!');
      if (onAddToCart) {
        onAddToCart();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    }
  };

  const finalPrice = product.discount_price || product.price || product.final_price;
  const originalPrice = product.price;
  const hasDiscount = product.discount_price && product.discount_price < originalPrice;
  const discountPercent = hasDiscount 
    ? Math.round(((originalPrice - product.discount_price) / originalPrice) * 100)
    : 0;

  // Check if product is out of stock
  const isOutOfStock = product.is_available === false || (product.stock_quantity !== undefined && product.stock_quantity === 0);

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200">
      {/* Product Image */}
      <Link to={`/shop`}>
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name || product.name_en}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
              <span className="text-6xl">🛠️</span>
            </div>
          )}
          {hasDiscount && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              -{discountPercent}%
            </div>
          )}
          {product.is_featured && (
            <div className="absolute top-2 left-2 bg-gold-400 text-white text-xs font-bold px-2 py-1 rounded">
              ⭐ Featured
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4">
        <Link to={`/shop`}>
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[3rem] hover:text-primary-500">
            {product.name || product.name_en}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-lg font-bold text-primary-600">
            ৳{parseFloat(finalPrice).toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-500 line-through">
              ৳{parseFloat(originalPrice).toFixed(2)}
            </span>
          )}
        </div>

        {/* Stock Status */}
        <div className="mb-3">
          {isOutOfStock ? (
            <span className="text-xs text-red-600 font-medium">
              ✗ Out of Stock
            </span>
          ) : (
            <span className="text-xs text-green-600 font-medium">
              ✓ In Stock{product.stock_quantity !== undefined ? ` (${product.stock_quantity} available)` : ''}
            </span>
          )}
        </div>

        {/* Rating */}
        {product.rating > 0 && (
          <div className="flex items-center mb-3">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-sm text-gray-600 ml-1">
              {parseFloat(product.rating).toFixed(1)} 
              {product.total_reviews > 0 && (
                <span className="text-gray-400"> ({product.total_reviews})</span>
              )}
            </span>
          </div>
        )}

        {/* Add to Cart Button */}
        {isOutOfStock ? (
          <button
            disabled
            className="w-full py-2 px-4 rounded-lg font-medium bg-gray-300 text-gray-500 cursor-not-allowed"
          >
            Out of Stock
          </button>
        ) : (
          <button
            onClick={handleAddToCart}
            className="w-full py-2 px-4 rounded-lg font-medium bg-primary-400 text-white hover:bg-primary-500 transition-colors"
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
