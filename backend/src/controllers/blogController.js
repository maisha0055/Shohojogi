const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Get all blog posts (published only for public, all for admin)
// @route   GET /api/blogs
// @access  Public
const getBlogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category = null } = req.query;
  const offset = (page - 1) * limit;

  let queryText = `
    SELECT 
      bp.*,
      u.full_name as author_name,
      u.profile_photo as author_photo
    FROM blog_posts bp
    LEFT JOIN users u ON bp.author_id = u.id
    WHERE 1=1
  `;

  const params = [];

  // If not admin, only show published posts
  if (req.user?.role !== 'admin') {
    queryText += ' AND bp.is_published = true';
  }

  // Filter by category if provided
  if (category) {
    params.push(category);
    queryText += ` AND bp.category = $${params.length}`;
  }

  queryText += ' ORDER BY bp.created_at DESC';

  // Add pagination
  params.push(limit, offset);
  queryText += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const result = await query(queryText, params);

  // Get total count
  let countQuery = `
    SELECT COUNT(*) FROM blog_posts bp
    WHERE 1=1
  `;
  const countParams = [];

  if (req.user?.role !== 'admin') {
    countQuery += ' AND bp.is_published = true';
  }

  if (category) {
    countParams.push(category);
    countQuery += ` AND bp.category = $${countParams.length}`;
  }

  const countResult = await query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get single blog post
// @route   GET /api/blogs/:id
// @access  Public
const getBlogById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `SELECT 
      bp.*,
      u.full_name as author_name,
      u.profile_photo as author_photo
    FROM blog_posts bp
    LEFT JOIN users u ON bp.author_id = u.id
    WHERE bp.id = $1 AND (bp.is_published = true OR $2 = 'admin')`,
    [id, req.user?.role || 'user']
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Blog post not found'
    });
  }

  // Increment views
  await query(
    'UPDATE blog_posts SET views = views + 1 WHERE id = $1',
    [id]
  );

  res.json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Create blog post
// @route   POST /api/blogs
// @access  Private (Admin only)
const createBlog = asyncHandler(async (req, res) => {
  const {
    title_en,
    title_bn,
    content_en,
    content_bn,
    category,
    is_published = true
  } = req.body;

  // Get image URL from request (uploaded via Cloudinary middleware or base64)
  const featured_image = req.cloudinaryUrl || req.body.featured_image;

  if (!title_en || !content_en) {
    return res.status(400).json({
      success: false,
      message: 'Title and content (English) are required'
    });
  }

  try {
    const result = await query(
      `INSERT INTO blog_posts 
       (title_en, title_bn, content_en, content_bn, author_id, category, featured_image, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title_en,
        title_bn || null,
        content_en,
        content_bn || null,
        req.user.id,
        category || null,
        featured_image || null,
        is_published
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Blog post created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    // Check if it's a database constraint error (like VARCHAR length limit)
    if (error.code === '22001' || 
        error.message?.includes('value too long') || 
        error.message?.includes('character varying') ||
        error.message?.includes('VARCHAR')) {
      console.error('[Blog Creation] Database column length error detected.');
      return res.status(400).json({
        success: false,
        message: 'Featured image URL is too long. The database column needs to be migrated. Please restart the server to run the automatic migration, or contact the administrator.',
        error: 'Database column type mismatch. Expected TEXT, but column is still VARCHAR(500).'
      });
    }
    throw error; // Re-throw to be handled by asyncHandler
  }
});

// @desc    Update blog post
// @route   PUT /api/blogs/:id
// @access  Private (Admin only)
const updateBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title_en,
    title_bn,
    content_en,
    content_bn,
    category,
    is_published
  } = req.body;

  // Get image URL from request (uploaded via Cloudinary middleware or base64)
  const featured_image = req.cloudinaryUrl || req.body.featured_image;

  // Build update query dynamically
  const updates = [];
  const params = [];
  let paramCount = 1;

  if (title_en !== undefined) {
    updates.push(`title_en = $${paramCount++}`);
    params.push(title_en);
  }
  if (title_bn !== undefined) {
    updates.push(`title_bn = $${paramCount++}`);
    params.push(title_bn);
  }
  if (content_en !== undefined) {
    updates.push(`content_en = $${paramCount++}`);
    params.push(content_en);
  }
  if (content_bn !== undefined) {
    updates.push(`content_bn = $${paramCount++}`);
    params.push(content_bn);
  }
  if (category !== undefined) {
    updates.push(`category = $${paramCount++}`);
    params.push(category);
  }
  // Handle image upload (from middleware or body)
  const imageUrl = req.cloudinaryUrl || req.body.featured_image;
  if (imageUrl !== undefined) {
    updates.push(`featured_image = $${paramCount++}`);
    params.push(imageUrl);
  }
  if (is_published !== undefined) {
    updates.push(`is_published = $${paramCount++}`);
    params.push(is_published);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No fields to update'
    });
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  try {
    const result = await query(
      `UPDATE blog_posts 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog post updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    // Check if it's a database constraint error (like VARCHAR length limit)
    if (error.code === '22001' || 
        error.message?.includes('value too long') || 
        error.message?.includes('character varying') ||
        error.message?.includes('VARCHAR')) {
      console.error('[Blog Update] Database column length error detected.');
      return res.status(400).json({
        success: false,
        message: 'Featured image URL is too long. The database column needs to be migrated. Please restart the server to run the automatic migration, or contact the administrator.',
        error: 'Database column type mismatch. Expected TEXT, but column is still VARCHAR(500).'
      });
    }
    throw error; // Re-throw to be handled by asyncHandler
  }
});

// @desc    Delete blog post
// @route   DELETE /api/blogs/:id
// @access  Private (Admin only)
const deleteBlog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    'DELETE FROM blog_posts WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Blog post not found'
    });
  }

  res.json({
    success: true,
    message: 'Blog post deleted successfully'
  });
});

module.exports = {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog
};

