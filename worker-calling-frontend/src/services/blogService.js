import api from './api';

const blogService = {
  // Get all blog posts
  getBlogs: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.category) queryParams.append('category', params.category);

    const response = await api.get(`/api/blogs?${queryParams.toString()}`);
    return response.data;
  },

  // Get single blog post
  getBlogById: async (id) => {
    const response = await api.get(`/api/blogs/${id}`);
    return response.data;
  },

  // Create blog post (Admin only)
  createBlog: async (blogData) => {
    const response = await api.post('/api/blogs', blogData);
    return response.data;
  },

  // Update blog post (Admin only)
  updateBlog: async (id, blogData) => {
    const response = await api.put(`/api/blogs/${id}`, blogData);
    return response.data;
  },

  // Delete blog post (Admin only)
  deleteBlog: async (id) => {
    const response = await api.delete(`/api/blogs/${id}`);
    return response.data;
  },
};

export default blogService;

