const express = require('express');
const router = express.Router();
const {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog
} = require('../controllers/blogController');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle, uploadToCloudinary } = require('../middleware/upload');

// Public routes
router.get('/', getBlogs);
router.get('/:id', getBlogById);

// Protected routes (Admin only)
router.post('/', protect, authorize('admin'), uploadSingle('featured_image'), uploadToCloudinary, createBlog);
router.put('/:id', protect, authorize('admin'), uploadSingle('featured_image'), uploadToCloudinary, updateBlog);
router.delete('/:id', protect, authorize('admin'), deleteBlog);

module.exports = router;

