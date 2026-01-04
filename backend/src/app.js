const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const workerRoutes = require('./routes/worker.routes');
const bookingRoutes = require('./routes/booking.routes');
const reviewRoutes = require('./routes/review.routes');
const paymentRoutes = require('./routes/payment.routes');
const chatRoutes = require('./routes/chat.routes');
const categoryRoutes = require('./routes/category.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const blogRoutes = require('./routes/blog.routes');
const adminRoutes = require('./routes/admin.routes');
const verificationRoutes = require('./routes/verification.routes');
const loyaltyRoutes = require('./routes/loyalty.routes');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - skip payment callbacks (they have their own CORS in routes)
const paymentCallbackPaths = [
  '/api/payments/sslcommerz/success',
  '/api/payments/sslcommerz/fail',
  '/api/payments/sslcommerz/cancel',
  '/api/payments/sslcommerz/ipn',
  '/api/payments/bkash/callback'
];

app.use((req, res, next) => {
  // Skip CORS for payment callback routes (they handle it in routes)
  if (paymentCallbackPaths.some(path => req.path.startsWith(path))) {
    return next(); // Skip global CORS, let route-level CORS handle it
  }
  
  // Apply CORS for all other routes
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl requests, or payment gateway redirects)
      if (!origin) return callback(null, true);
      
      // Allow SSLCommerz and other payment gateway domains
      const paymentGatewayDomains = [
        'https://sandbox.sslcommerz.com',
        'https://securepay.sslcommerz.com',
        'https://www.sslcommerz.com'
      ];
      if (paymentGatewayDomains.some(domain => origin.startsWith(domain))) {
        return callback(null, true);
      }
      
      // In development, allow all localhost ports
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }
      }
      
      // In production, use FRONTEND_URL from env or default
      const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:3000'];
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  };
  
  cors(corsOptions)(req, res, next);
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Worker Calling System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      workers: '/api/workers',
      bookings: '/api/bookings',
      reviews: '/api/reviews',
      payments: '/api/payments',
      chat: '/api/chat',
      categories: '/api/categories',
      blogs: '/api/blogs',
      admin: '/api/admin'
    },
    documentation: 'Check backend setup guide for all available endpoints'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/loyalty', loyaltyRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;