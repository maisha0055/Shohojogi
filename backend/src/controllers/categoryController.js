const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all service categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const { language = 'en' } = req.query;

  const result = await query(
    `SELECT 
      id,
      CASE WHEN $1 = 'bn' THEN name_bn ELSE name_en END as name,
      CASE WHEN $1 = 'bn' THEN description_bn ELSE description_en END as description,
      icon_url,
      (SELECT COUNT(*) FROM worker_profiles WHERE service_category_id = sc.id AND verification_status = 'verified') as worker_count
    FROM service_categories sc
    WHERE is_active = true
    ORDER BY name`,
    [language]
  );

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Get single category with workers
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { language = 'en' } = req.query;

  const categoryResult = await query(
    `SELECT 
      id,
      CASE WHEN $2 = 'bn' THEN name_bn ELSE name_en END as name,
      CASE WHEN $2 = 'bn' THEN description_bn ELSE description_en END as description,
      icon_url
    FROM service_categories
    WHERE id = $1 AND is_active = true`,
    [id, language]
  );

  if (categoryResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  // Get workers in this category
  const workersResult = await query(
    `SELECT 
      u.id,
      u.full_name,
      u.profile_photo,
      u.address,
      wp.hourly_rate,
      wp.average_rating,
      wp.total_reviews,
      wp.availability_status
    FROM users u
    INNER JOIN worker_profiles wp ON u.id = wp.user_id
    WHERE wp.service_category_id = $1 
      AND wp.verification_status = 'verified'
      AND u.is_active = true
    ORDER BY wp.is_featured DESC, wp.average_rating DESC
    LIMIT 20`,
    [id]
  );

  res.json({
    success: true,
    data: {
      category: categoryResult.rows[0],
      workers: workersResult.rows
    }
  });
});

// @desc    Create service category (Admin only)
// @route   POST /api/categories
// @access  Private (Admin)
const createCategory = asyncHandler(async (req, res) => {
  const { name_en, name_bn, description_en, description_bn, icon_url } = req.body;

  if (!name_en || !name_bn) {
    return res.status(400).json({
      success: false,
      message: 'Category names in both languages are required'
    });
  }

  const result = await query(
    `INSERT INTO service_categories (name_en, name_bn, description_en, description_bn, icon_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name_en, name_bn, description_en, description_bn, icon_url]
  );

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: result.rows[0]
  });
});

// @desc    Update service category (Admin only)
// @route   PUT /api/categories/:id
// @access  Private (Admin)
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name_en, name_bn, description_en, description_bn, icon_url, is_active } = req.body;

  const updateFields = [];
  const values = [];
  let paramCount = 0;

  if (name_en !== undefined) {
    paramCount++;
    updateFields.push(`name_en = $${paramCount}`);
    values.push(name_en);
  }

  if (name_bn !== undefined) {
    paramCount++;
    updateFields.push(`name_bn = $${paramCount}`);
    values.push(name_bn);
  }

  if (description_en !== undefined) {
    paramCount++;
    updateFields.push(`description_en = $${paramCount}`);
    values.push(description_en);
  }

  if (description_bn !== undefined) {
    paramCount++;
    updateFields.push(`description_bn = $${paramCount}`);
    values.push(description_bn);
  }

  if (icon_url !== undefined) {
    paramCount++;
    updateFields.push(`icon_url = $${paramCount}`);
    values.push(icon_url);
  }

  if (is_active !== undefined) {
    paramCount++;
    updateFields.push(`is_active = $${paramCount}`);
    values.push(is_active);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No fields to update'
    });
  }

  paramCount++;
  values.push(id);

  const result = await query(
    `UPDATE service_categories 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: result.rows[0]
  });
});

// @desc    Delete service category (Admin only)
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if any workers are using this category
  const workerCheck = await query(
    'SELECT COUNT(*) FROM worker_profiles WHERE service_category_id = $1',
    [id]
  );

  if (parseInt(workerCheck.rows[0].count) > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete category with active workers. Please reassign workers first.'
    });
  }

  const result = await query(
    'DELETE FROM service_categories WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Category not found'
    });
  }

  res.json({
    success: true,
    message: 'Category deleted successfully'
  });
});

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};