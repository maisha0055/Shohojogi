const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status } = req.query;

  let whereClause = 'WHERE o.user_id = $1';
  const queryParams = [userId];
  let paramCount = 1;

  if (status && status !== 'all') {
    paramCount++;
    whereClause += ` AND o.status = $${paramCount}`;
    queryParams.push(status);
  }

  const result = await query(
    `SELECT 
      o.id,
      o.order_number,
      o.total_amount,
      o.discount_amount,
      o.loyalty_points_used,
      o.loyalty_points_earned,
      o.payment_method,
      o.payment_status,
      o.payment_transaction_id,
      o.shipping_address,
      o.shipping_phone,
      o.status,
      o.created_at,
      o.updated_at,
      COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    ${whereClause}
    GROUP BY o.id
    ORDER BY o.created_at DESC`,
    queryParams
  );

  // Get order items for each order
  const ordersWithItems = await Promise.all(
    result.rows.map(async (order) => {
      const itemsResult = await query(
        `SELECT 
          oi.id,
          oi.product_id,
          oi.product_price,
          oi.quantity,
          oi.subtotal,
          oi.product_name,
          p.image_url
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1`,
        [order.id]
      );

      return {
        ...order,
        items: itemsResult.rows,
        total_amount: parseFloat(order.total_amount),
        discount_amount: parseFloat(order.discount_amount || 0)
      };
    })
  );

  res.json({
    success: true,
    data: ordersWithItems
  });
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const orderResult = await query(
    `SELECT 
      o.id,
      o.order_number,
      o.total_amount,
      o.discount_amount,
      o.loyalty_points_used,
      o.loyalty_points_earned,
      o.payment_method,
      o.payment_status,
      o.payment_transaction_id,
      o.shipping_address,
      o.shipping_phone,
      o.status,
      o.created_at,
      o.updated_at
    FROM orders o
    WHERE o.id = $1 AND o.user_id = $2`,
    [id, userId]
  );

  if (orderResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  const itemsResult = await query(
    `SELECT 
      oi.id,
      oi.product_id,
      oi.product_price,
      oi.quantity,
      oi.subtotal,
      oi.product_name,
      p.image_url
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...orderResult.rows[0],
      items: itemsResult.rows,
      total_amount: parseFloat(orderResult.rows[0].total_amount),
      discount_amount: parseFloat(orderResult.rows[0].discount_amount || 0)
    }
  });
});

module.exports = {
  getUserOrders,
  getOrderById
};

