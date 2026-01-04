const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  try {
    const { 
    category, 
    search, 
    featured, 
    min_price, 
    max_price,
    limit = 50,
    offset = 0,
    language = 'en'
  } = req.query;

  let whereConditions = [];
  let queryParams = [];
  let paramCount = 0;

  // Only show available products to public
  whereConditions.push(`is_available = true`);
  
  if (category) {
    paramCount++;
    whereConditions.push(`category = $${paramCount}`);
    queryParams.push(category);
  }

  if (search) {
    paramCount++;
    whereConditions.push(`(name_en ILIKE $${paramCount} OR description_en ILIKE $${paramCount})`);
    queryParams.push(`%${search}%`);
  }

  if (featured === 'true') {
    whereConditions.push(`is_featured = true`);
  }

  if (min_price) {
    paramCount++;
    const priceField = `COALESCE(discount_price, price)`;
    whereConditions.push(`${priceField} >= $${paramCount}`);
    queryParams.push(parseFloat(min_price));
  }

  if (max_price) {
    paramCount++;
    const priceField = `COALESCE(discount_price, price)`;
    whereConditions.push(`${priceField} <= $${paramCount}`);
    queryParams.push(parseFloat(max_price));
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  // Build the SELECT query with language support
  const languageParam = language === 'bn' ? 'bn' : 'en';
  const selectFields = languageParam === 'bn' 
    ? `name_bn as name, description_bn as description`
    : `name_en as name, description_en as description`;

  paramCount++;
  queryParams.push(parseInt(limit));
  paramCount++;
  queryParams.push(parseInt(offset));

  const result = await query(
    `SELECT 
      id,
      name_en,
      name_bn,
      ${selectFields},
      category,
      price,
      discount_price,
      COALESCE(discount_price, price) as final_price,
      image_url,
      stock_quantity,
      rating,
      total_reviews,
      is_featured
    FROM products
    ${whereClause}
    ORDER BY is_featured DESC, created_at DESC
    LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
    queryParams
  );

  // Get total count for pagination
  const countParams = queryParams.slice(0, -2); // Remove limit and offset
  const countResult = await query(
    `SELECT COUNT(*) FROM products ${whereClause}`,
    countParams
  );

  res.json({
    success: true,
    data: result.rows,
    total: parseInt(countResult.rows[0].count),
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
  } catch (error) {
    console.error('Error fetching products:', error);
    // If products table doesn't exist yet, return empty array instead of error
    if (error.message && (error.message.includes('does not exist') || error.message.includes('relation "products" does not exist'))) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        limit: parseInt(req.query.limit || 50),
        offset: parseInt(req.query.offset || 0)
      });
    }
    throw error; // Re-throw other errors to be handled by asyncHandler
  }
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { language = 'en' } = req.query;

  const result = await query(
    `SELECT 
      id,
      name_en,
      name_bn,
      CASE WHEN $2 = 'bn' THEN name_bn ELSE name_en END as name,
      description_en,
      description_bn,
      CASE WHEN $2 = 'bn' THEN description_bn ELSE description_en END as description,
      category,
      price,
      discount_price,
      COALESCE(discount_price, price) as final_price,
      image_url,
      stock_quantity,
      is_available,
      rating,
      total_reviews,
      is_featured
    FROM products
    WHERE id = $1`,
    [id, language]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Create product (Admin only)
// @route   POST /api/products
// @access  Private (Admin)
const createProduct = asyncHandler(async (req, res) => {
  const {
    name_en,
    name_bn,
    description_en,
    description_bn,
    category,
    price,
    discount_price,
    image_url,
    stock_quantity,
    is_featured,
    is_available
  } = req.body;

  if (!name_en || !category || price === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Name (English), category, and price are required'
    });
  }

  if (price < 0 || (discount_price !== undefined && discount_price < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Price must be non-negative'
    });
  }

  // Get image URL from request (uploaded via Cloudinary middleware or base64)
  const productImageUrl = req.cloudinaryUrl || null;

  try {
    const result = await query(
      `INSERT INTO products (
        name_en, name_bn, description_en, description_bn, 
        category, price, discount_price, image_url, 
        stock_quantity, is_featured, is_available
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        name_en,
        name_bn || null,
        description_en || null,
        description_bn || null,
        category,
        parseFloat(price),
        discount_price ? parseFloat(discount_price) : null,
        productImageUrl,
        stock_quantity ? parseInt(stock_quantity) : 0,
        is_featured || false,
        is_available !== undefined ? is_available : true
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    // Check if it's a database constraint error (like VARCHAR length limit)
    if (error.code === '22001' || 
        error.message?.includes('value too long') || 
        error.message?.includes('character varying') ||
        error.message?.includes('VARCHAR')) {
      console.error('[Product Creation] Database column length error detected.');
      return res.status(400).json({
        success: false,
        message: 'Product image URL is too long. The database column needs to be migrated. Please restart the server to run the automatic migration, or contact the administrator.',
        error: 'Database column type mismatch. Expected TEXT, but column is still VARCHAR(500).'
      });
    }
    throw error; // Re-throw to be handled by asyncHandler
  }
});

// @desc    Update product (Admin only)
// @route   PUT /api/products/:id
// @access  Private (Admin)
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // When using FormData with multer, all fields are in req.body as strings
  const {
    name_en,
    name_bn,
    description_en,
    description_bn,
    category,
    price,
    discount_price,
    stock_quantity,
    is_available,
    is_featured
  } = req.body || {};

  const updateFields = [];
  const values = [];
  let paramCount = 0;

  // Handle image_url: only update if new image is uploaded
  if (req.cloudinaryUrl !== undefined && req.cloudinaryUrl !== null) {
    paramCount++;
    updateFields.push(`image_url = $${paramCount}`);
    values.push(req.cloudinaryUrl);
  }

  // Process all fields from FormData - check if they exist (not just truthy)
  if (name_en !== undefined) {
    paramCount++;
    updateFields.push(`name_en = $${paramCount}`);
    values.push(name_en || null);
  }

  if (name_bn !== undefined) {
    paramCount++;
    updateFields.push(`name_bn = $${paramCount}`);
    values.push(name_bn || null);
  }

  if (description_en !== undefined) {
    paramCount++;
    updateFields.push(`description_en = $${paramCount}`);
    values.push(description_en || null);
  }

  if (description_bn !== undefined) {
    paramCount++;
    updateFields.push(`description_bn = $${paramCount}`);
    values.push(description_bn || null);
  }

  if (category !== undefined) {
    paramCount++;
    updateFields.push(`category = $${paramCount}`);
    values.push(category || null);
  }

  if (price !== undefined) {
    paramCount++;
    updateFields.push(`price = $${paramCount}`);
    values.push(price && price !== '' ? parseFloat(price) : null);
  }

  if (discount_price !== undefined) {
    paramCount++;
    updateFields.push(`discount_price = $${paramCount}`);
    values.push(discount_price && discount_price !== '' ? parseFloat(discount_price) : null);
  }

  if (stock_quantity !== undefined) {
    paramCount++;
    updateFields.push(`stock_quantity = $${paramCount}`);
    values.push(stock_quantity && stock_quantity !== '' ? parseInt(stock_quantity) : 0);
  }

  if (is_available !== undefined) {
    paramCount++;
    updateFields.push(`is_available = $${paramCount}`);
    // Handle string 'true'/'false' from FormData or boolean
    const boolValue = is_available === 'true' || is_available === true || is_available === '1';
    values.push(boolValue);
  }

  if (is_featured !== undefined) {
    paramCount++;
    updateFields.push(`is_featured = $${paramCount}`);
    // Handle string 'true'/'false' from FormData or boolean
    const boolValue = is_featured === 'true' || is_featured === true || is_featured === '1';
    values.push(boolValue);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No fields to update'
    });
  }

  // Add updated_at (no parameter needed)
  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  
  // Add id as the last parameter
  paramCount++;
  values.push(id);

  try {
    const result = await query(
      `UPDATE products 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    // Check if it's a database constraint error (like VARCHAR length limit)
    if (error.code === '22001' || 
        error.message?.includes('value too long') || 
        error.message?.includes('character varying') ||
        error.message?.includes('VARCHAR')) {
      console.error('[Product Update] Database column length error detected.');
      return res.status(400).json({
        success: false,
        message: 'Product image URL is too long. The database column needs to be migrated. Please restart the server to run the automatic migration, or contact the administrator.',
        error: 'Database column type mismatch. Expected TEXT, but column is still VARCHAR(500).'
      });
    }
    throw error; // Re-throw to be handled by asyncHandler
  }
});

// @desc    Delete product (Admin only)
// @route   DELETE /api/products/:id
// @access  Private (Admin)
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if product is in any orders
  const orderCheck = await query(
    'SELECT COUNT(*) FROM order_items WHERE product_id = $1',
    [id]
  );

  if (parseInt(orderCheck.rows[0].count) > 0) {
    // Soft delete by setting is_available to false
    await query(
      'UPDATE products SET is_available = false WHERE id = $1',
      [id]
    );
    return res.json({
      success: true,
      message: 'Product marked as unavailable (cannot delete products with orders)'
    });
  }

  const result = await query(
    'DELETE FROM products WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  res.json({
    success: true,
    message: 'Product deleted successfully'
  });
});

// @desc    Get product categories
// @route   GET /api/products/categories
// @access  Public
const getProductCategories = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT DISTINCT category, COUNT(*) as product_count
     FROM products
     WHERE is_available = true
     GROUP BY category
     ORDER BY category`
  );

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Get all products (Admin only - includes inactive)
// @route   GET /api/admin/products
// @access  Private (Admin)
const getAllProductsAdmin = asyncHandler(async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        id,
        name_en,
        name_bn,
        description_en,
        description_bn,
        category,
        price,
        discount_price,
        image_url,
        stock_quantity,
        is_available,
        is_featured,
        rating,
        total_reviews,
        created_at,
        updated_at
      FROM products
      ORDER BY created_at DESC`,
      []
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching products (admin):', error);
    // If products table doesn't exist yet, return empty array
    if (error.message && (error.message.includes('does not exist') || error.message.includes('relation "products" does not exist'))) {
      return res.json({
        success: true,
        data: []
      });
    }
    throw error;
  }
});

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductCategories,
  getAllProductsAdmin
};

