// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import Loader from '../components/common/Loader';
import BlogSection from '../components/blog/BlogSection';
import ShopSection from '../components/shop/ShopSection';

// Component for category image slideshow
const CategoryImageSlider = ({ categoryIndex }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const images = ['worker1.png', 'worker2.png', 'worker3.png', 'worker4.png', 'worker5.png'];
  const publicUrl = process.env.PUBLIC_URL || '';
  const getImagePath = (imageName) => {
    return publicUrl ? `${publicUrl}/${imageName}` : `/${imageName}`;
  };

  useEffect(() => {
    // Stagger the starting index based on category to create variety
    const startIndex = categoryIndex % images.length;
    setCurrentImageIndex(startIndex);

    // Auto-advance images every 2.5 seconds
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
        setIsTransitioning(false);
      }, 300); // Half of transition duration
    }, 2500);

    return () => clearInterval(interval);
  }, [categoryIndex, images.length]);

  return (
    <div className="w-24 h-24 mx-auto mb-4 bg-peach-50 rounded-lg flex items-center justify-center border-2 border-primary-200 overflow-hidden relative group shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Image container with smooth fade */}
      <div className="relative w-full h-full">
        {images.map((image, index) => (
          <img
            key={image}
            src={getImagePath(image)}
            alt={`Worker ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            } ${isTransitioning && index === currentImageIndex ? 'scale-105' : 'scale-100'}`}
            style={{
              transition: 'opacity 0.7s ease-in-out, transform 0.7s ease-in-out'
            }}
          />
        ))}
      </div>
      
      {/* Overlay gradient for better visibility on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      
      {/* Image indicators (dots) - show on hover */}
      <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        {images.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentImageIndex ? 'bg-white w-4 shadow-lg' : 'bg-white/70 w-1.5'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const Home = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      if (response.data.success) {
        setCategories(response.data.data);
        console.log('Categories loaded:', response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/workers?category=${categoryId}`);
  };

  return (
    <div>
      {/* ================= HERO SECTION ================= */}
      <section
        className="relative text-white py-24"
        style={{
          backgroundImage: `url('${process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/header.jpg` : '/header.jpg'}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/20"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t('home.title')}
            <br />
            {t('home.titleLine2')}
          </h1>

          <p className="text-xl md:text-2xl mb-8 text-gray-200">
            {t('home.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/workers"
              className="bg-white text-primary-500 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-peach-50 transition"
            >
              {t('home.findWorkersNow')}
            </Link>

            <Link
              to="/register"
              className="bg-primary-400 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-500 transition border-2 border-white"
            >
              {t('home.becomeWorker')}
            </Link>
          </div>
        </div>
      </section>
      {/* ================= END HERO SECTION ================= */}

      {/* QUICK ACCESS BUTTONS - Workers & Chat/Store */}
      <section className="py-16 bg-peach-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          {/* Dark Mode Toggle Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border-2 border-gray-200 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="font-medium">Light Mode</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span className="font-medium">Dark Mode</span>
                </>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Workers Button */}
            <Link
              to="/workers"
              className="group relative overflow-hidden bg-white dark:bg-gray-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-primary-400 dark:hover:border-primary-500"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors">
                  {t('worker.workers')}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {t('home.findWorkersDesc')}
                </p>
                <span className="inline-flex items-center text-primary-500 font-semibold group-hover:text-primary-600">
                  {t('home.exploreWorkers')}
                  <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>

            {/* Store Button - Only show when user is NOT logged in */}
            {!user && (
              <Link
                to="/shop"
                className="group relative overflow-hidden bg-white dark:bg-gray-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-amber-400 dark:hover:border-amber-500"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="p-8 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    {t('shop.shop')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t('shop.everythingYouNeed')}
                  </p>
                  <span className="inline-flex items-center text-amber-600 font-semibold group-hover:text-amber-700">
                    {t('shop.viewAllProducts')}
                    <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            )}

            {/* Chat Button - Only show when user is logged in */}
            {user && (
              <Link
                to="/chat"
                className="group relative overflow-hidden bg-white dark:bg-gray-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-sage-300 dark:hover:border-sage-400"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-sage-300 to-sage-400 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="p-8 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-sage-300 to-sage-400 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-sage-600 dark:group-hover:text-sage-400 transition-colors">
                    {t('common.chat')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t('home.chatDesc')}
                  </p>
                  <span className="inline-flex items-center text-sage-600 font-semibold group-hover:text-sage-700">
                    {t('home.openChat')}
                    <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* SERVICE CATEGORIES */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
            {t('home.popularServices')}
          </h2>

          {loading ? (
            <div className="flex justify-center">
              <Loader />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold">
                {t('home.noServicesAvailable')}
              </h3>
              <p className="text-gray-600">
                {t('home.checkBackLater')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {categories.slice(0, 10).map((category, index) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="card text-center hover:shadow-lg transition-all duration-300 transform hover:scale-105 dark:bg-gray-800 dark:text-gray-100"
                >
                  <CategoryImageSlider categoryIndex={index} />
                  <h3 className="font-semibold">{category.name}</h3>
                  {category.worker_count > 0 && (
                    <p className="text-sm text-gray-500">
                      {category.worker_count} {t('home.workers')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <Link to="/workers" className="btn-primary">
              {t('home.viewAllServices')}
            </Link>
          </div>
        </div>
      </section>

      {/* SHOP SECTION */}
      <ShopSection />

      {/* BLOG SECTION */}
      <BlogSection />

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-primary-400 to-primary-500 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">
          {t('home.readyToGetStarted')}
        </h2>
        <p className="text-xl mb-8 text-white/90">
          {t('home.joinThousands')}
        </p>
        <Link
          to="/register"
          className="bg-white text-primary-500 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-peach-50 transition shadow-lg"
        >
          {t('home.signUpNow')}
        </Link>
      </section>
    </div>
  );
};

export default Home;
