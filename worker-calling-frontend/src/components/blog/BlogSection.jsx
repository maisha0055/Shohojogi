import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import blogService from '../../services/blogService';
import Loader from '../common/Loader';

const BlogSection = () => {
  const { t } = useLanguage();
  const [blogs, setBlogs] = useState([]);
  const [allBlogs, setAllBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const response = await blogService.getBlogs({ limit: 100 });
      console.log('Blog API Response:', response); // Debug log
      if (response.success) {
        const allBlogsData = response.data || [];
        console.log('Blogs fetched:', allBlogsData.length); // Debug log
        setAllBlogs(allBlogsData);
        setBlogs(allBlogsData.slice(0, 6)); // Show first 6 initially
      } else {
        console.error('Blog API returned success: false', response);
        setBlogs([]);
        setAllBlogs([]);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Show section even on error, but with empty state
      setBlogs([]);
      setAllBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = () => {
    setExpanded(true);
    setBlogs(allBlogs);
  };

  const handleCollapse = () => {
    setExpanded(false);
    setBlogs(allBlogs.slice(0, 6));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const truncateContent = (content, maxLength = 150) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <Loader />
          </div>
        </div>
      </section>
    );
  }

  // Show section even if no blogs, but with a message
  if (blogs.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('blog.latestNewsAndBlog')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('blog.stayUpdated')}
            </p>
          </div>
          
          {/* Empty State */}
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📰</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {t('blog.noBlogPostsAvailable')}
            </h3>
            <p className="text-gray-600">{t('blog.checkBackSoon')}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('blog.latestNewsAndBlog')}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('blog.stayUpdated')}
          </p>
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {blogs.map((blog) => (
            <Link
              key={blog.id}
              to={`/blogs/${blog.id}`}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              {/* Featured Image */}
              <div className="relative h-48 bg-gradient-to-br from-primary-400 to-primary-600 overflow-hidden">
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
                    {t('blog.readMore')} →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Expand/Collapse and View All Buttons */}
        <div className="text-center space-x-4">
          {allBlogs.length > 6 && (
            <button
              onClick={expanded ? handleCollapse : handleExpand}
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors shadow-md hover:shadow-lg"
            >
              {expanded ? (
                <>
                  {t('blog.showLess')}
                  <span className="ml-2">↑</span>
                </>
              ) : (
                <>
                  {t('blog.viewAll')} ({allBlogs.length} {t('blog.articles')})
                  <span className="ml-2">↓</span>
                </>
              )}
            </button>
          )}
          <Link
            to="/blogs"
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg"
          >
            {t('blog.browseAllArticles')}
            <span className="ml-2">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;

