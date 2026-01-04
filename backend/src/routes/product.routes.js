const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductCategories
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle, uploadToCloudinary } = require('../middleware/upload');

// Public routes
router.get('/', getProducts);
router.get('/categories', getProductCategories);
router.get('/:id', getProductById);

// Admin routes
router.post('/', protect, authorize('admin'), uploadSingle('image'), uploadToCloudinary, createProduct);
router.put('/:id', protect, authorize('admin'), uploadSingle('image'), uploadToCloudinary, updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;

