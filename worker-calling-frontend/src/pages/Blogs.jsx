import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import blogService from '../services/blogService';
import Loader from '../components/common/Loader';

const Blogs = () => {
  const { t } = useLanguage();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      const response = await blogService.getBlogs(params);
      if (response.success) {
        setBlogs(response.data || []);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(response.data.map(blog => blog.category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const truncateContent = (content, maxLength = 200) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {t('blog.ourBlog')}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('blog.stayUpdated')}
          </p>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mb-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t('blog.all')}
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Blog Grid */}
        {blogs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 text-6xl mb-4">📰</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('blog.noBlogPostsFound')}
            </h3>
            <p className="text-gray-600">
              {selectedCategory !== 'all'
                ? t('blog.noBlogsInCategory', { category: selectedCategory }).replace('{{category}}', selectedCategory)
                : t('blog.checkBackSoon')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <Link
                key={blog.id}
                to={`/blogs/${blog.id}`}
                className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
              >
                {/* Featured Image */}
                <div className="relative h-56 bg-gradient-to-br from-primary-400 to-primary-600 overflow-hidden">
                  {blog.featured_image ? (
                    <img
                      src={blog.featured_image}
                      alt={blog.title_en}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl text-white opacity-50">📰</span>
                    </div>
                  )}
                  {/* Category Badge */}
                  {blog.category && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-white text-primary-600 px-3 py-1 rounded-full text-xs font-semibold shadow-md">
                        {blog.category}
                      </span>
                    </div>
                  )}
                  {/* Views Badge */}
                  <div className="absolute top-4 right-4">
                    <span className="bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      👁️ {blog.views || 0}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors line-clamp-2">
                    {blog.title_en}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {truncateContent(blog.content_en)}
                  </p>

                  {/* Meta Information */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      {blog.author_photo ? (
                        <img
                          src={blog.author_photo}
                          alt={blog.author_name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 text-xs font-bold">
                            {blog.author_name?.charAt(0) || 'A'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-gray-900">
                          {blog.author_name || 'Admin'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(blog.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className="text-primary-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                      Read More →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Blogs;

