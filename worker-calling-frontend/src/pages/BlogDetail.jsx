import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import blogService from '../services/blogService';
import Loader from '../components/common/Loader';

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBlog = useCallback(async () => {
    try {
      setLoading(true);
      const response = await blogService.getBlogById(id);
      if (response.success) {
        setBlog(response.data);
      } else {
        setError('Blog post not found');
      }
    } catch (err) {
      console.error('Error fetching blog:', err);
      setError('Failed to load blog post');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBlog();
  }, [fetchBlog]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Blog Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The blog post you are looking for does not exist.'}</p>
          <Link to="/" className="btn-primary">
            Go Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-primary-600 hover:text-primary-700 flex items-center gap-2"
        >
          <span>←</span> Back
        </button>

        {/* Article Header */}
        <article className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Featured Image */}
          {blog.featured_image && (
            <div className="w-full h-96 overflow-hidden">
              <img
                src={blog.featured_image}
                alt={blog.title_en}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8 md:p-12">
            {/* Category & Date */}
            <div className="flex items-center justify-between mb-6">
              {blog.category && (
                <span className="bg-primary-100 text-primary-600 px-4 py-2 rounded-full text-sm font-semibold">
                  {blog.category}
                </span>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>👁️ {blog.views || 0} views</span>
                <span>📅 {formatDate(blog.created_at)}</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {blog.title_en}
            </h1>

            {/* Author Info */}
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-200">
              {blog.author_photo ? (
                <img
                  src={blog.author_photo}
                  alt={blog.author_name}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-bold">
                    {blog.author_name?.charAt(0) || 'A'}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{blog.author_name || 'Admin'}</p>
                <p className="text-sm text-gray-500">Author</p>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
              {blog.content_en || blog.content_bn || 'No content available.'}
            </div>
          </div>
        </article>

        {/* Related Actions */}
        <div className="mt-8 text-center space-x-4">
          <Link to="/blogs" className="btn-secondary">
            ← All Blogs
          </Link>
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogDetail;

