const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await query(
    `SELECT 
      ci.id,
      ci.quantity,
      ci.created_at,
      p.id as product_id,
      p.name_en,
      p.name_bn,
      p.image_url,
      p.price,
      p.discount_price,
      COALESCE(p.discount_price, p.price) as final_price,
      p.stock_quantity,
      p.is_available
    FROM cart_items ci
    INNER JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = $1
    ORDER BY ci.created_at DESC`,
    [userId]
  );

  let total = 0;
  const items = result.rows.map(item => {
    const itemTotal = parseFloat(item.final_price) * item.quantity;
    total += itemTotal;
    return {
      id: item.id,
      product_id: item.product_id,
      name_en: item.name_en,
      name_bn: item.name_bn,
      image_url: item.image_url,
      price: parseFloat(item.price),
      discount_price: item.discount_price ? parseFloat(item.discount_price) : null,
      final_price: parseFloat(item.final_price),
      quantity: item.quantity,
      stock_quantity: item.stock_quantity,
      is_available: item.is_available,
      subtotal: itemTotal
    };
  });

  res.json({
    success: true,
    data: {
      items,
      total: total.toFixed(2),
      item_count: items.length
    }
  });
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { product_id, quantity = 1 } = req.body;

  if (!product_id) {
    return res.status(400).json({
      success: false,
      message: 'Product ID is required'
    });
  }

  // Check if product exists and is available
  const productResult = await query(
    'SELECT id, stock_quantity, is_available FROM products WHERE id = $1',
    [product_id]
  );

  if (productResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  const product = productResult.rows[0];

  if (!product.is_available) {
    return res.status(400).json({
      success: false,
      message: 'Product is not available'
    });
  }

  // Check if item already in cart
  const existingItem = await query(
    'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
    [userId, product_id]
  );

  if (existingItem.rows.length > 0) {
    // Update quantity
    const newQuantity = existingItem.rows[0].quantity + quantity;
    
    if (newQuantity > product.stock_quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock_quantity} items available in stock`
      });
    }

    const result = await query(
      'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newQuantity, existingItem.rows[0].id]
    );

    return res.json({
      success: true,
      message: 'Cart updated successfully',
      data: result.rows[0]
    });
  }

  // Add new item to cart
  if (quantity > product.stock_quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${product.stock_quantity} items available in stock`
    });
  }

  const result = await query(
    'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3) RETURNING *',
    [userId, product_id, quantity]
  );

  res.status(201).json({
    success: true,
    message: 'Item added to cart',
    data: result.rows[0]
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:id
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be at least 1'
    });
  }

  // Check if cart item belongs to user
  const cartItem = await query(
    `SELECT ci.*, p.stock_quantity, p.is_available 
     FROM cart_items ci
     INNER JOIN products p ON ci.product_id = p.id
     WHERE ci.id = $1 AND ci.user_id = $2`,
    [id, userId]
  );

  if (cartItem.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Cart item not found'
    });
  }

  if (quantity > cartItem.rows[0].stock_quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${cartItem.rows[0].stock_quantity} items available in stock`
    });
  }

  if (!cartItem.rows[0].is_available) {
    return res.status(400).json({
      success: false,
      message: 'Product is no longer available'
    });
  }

  const result = await query(
    'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
    [quantity, id]
  );

  res.json({
    success: true,
    message: 'Cart item updated',
    data: result.rows[0]
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:id
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const result = await query(
    'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Cart item not found'
    });
  }

  res.json({
    success: true,
    message: 'Item removed from cart'
  });
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await query(
    'DELETE FROM cart_items WHERE user_id = $1',
    [userId]
  );

  res.json({
    success: true,
    message: 'Cart cleared'
  });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};

