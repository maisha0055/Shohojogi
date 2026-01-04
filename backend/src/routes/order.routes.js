const express = require('express');
const router = express.Router();
const {
  getUserOrders,
  getOrderById
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/', getUserOrders);
router.get('/:id', getOrderById);

module.exports = router;

