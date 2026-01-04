require('dotenv').config();
const app = require('./src/app');
const { initializeTables } = require('./src/config/database');
const http = require('http');
const { initializeSocket } = require('./src/socket/socketServer');

// Validate required environment variables
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => {
    console.error(`   - ${envVar}`);
  });
  console.error('\nPlease check your .env file and ensure all required variables are set.');
  console.error('Refer to .env.example for the complete list of variables.\n');
  process.exit(1);
}

const PORT = process.env.PORT || 5050;

// Create HTTP server
const server = http.createServer(app);

// Start server
const startServer = async () => {
  try {
    // Initialize database
    console.log('🔄 Checking database connection...');
    const dbInitialized = await initializeTables();
    
    if (!dbInitialized) {
      console.error('❌ Database initialization failed. Please run init.sql first.');
      process.exit(1);
    }

    // Initialize Socket.io
    initializeSocket(server);

    // Start listening
    server.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 Worker Calling System API Server');
      console.log('='.repeat(60));
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ API URL: http://localhost:${PORT}`);
      console.log(`✓ Health Check: http://localhost:${PORT}/health`);
      console.log(`✓ Socket.io initialized`);
      console.log('='.repeat(60) + '\n');
      
      // Display helpful information
      console.log('📋 Available Endpoints:');
      console.log('   POST   /api/auth/register');
      console.log('   POST   /api/auth/login');
      console.log('   GET    /api/auth/me (protected)');
      console.log('   PUT    /api/auth/update-password (protected)');
      console.log('   POST   /api/auth/forgot-password');
      console.log('\n💡 Tips:');
      console.log('   - Use Postman or any API client to test endpoints');
      console.log('   - Check .env.example for all required configurations');
      console.log('   - Frontend URL: ' + (process.env.FRONTEND_URL || 'http://localhost:3000'));
      console.log('\n');
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown function
const gracefulShutdown = () => {
  console.log('\n⚠️  Received shutdown signal, closing server gracefully...');
  
  server.close(() => {
    console.log('✓ HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle unhandled promise rejections (don't crash on Cloudinary errors)
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  // Don't crash on Cloudinary errors or other non-critical errors
  if (err.message && err.message.includes('Cloudinary')) {
    console.error('⚠️  Cloudinary error handled, continuing...');
    return;
  }
  // Only crash on critical errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    console.error('❌ Critical connection error, shutting down...');
    server.close(() => process.exit(1));
  }
  // Log but don't crash for other errors
  console.error('⚠️  Non-critical error, server continues running');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Only crash on critical errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    server.close(() => process.exit(1));
  }
});

// Start the server
startServer();