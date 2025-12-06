#!/bin/bash

# Run this script from the backend directory
# chmod +x setup.sh && ./setup.sh

echo "Creating Module 1 project structure..."

# Create main source directories
mkdir -p src/{auth,users,workers,services,shared}

# Auth module structure
mkdir -p src/auth/{dto,guards,strategies}

# Users module structure  
mkdir -p src/users/{entities,dto}

# Workers module structure
mkdir -p src/workers/{entities,dto}

# Services module structure
mkdir -p src/services/{entities,dto}

# Shared utilities
mkdir -p src/shared/{decorators,filters,interceptors,pipes}

# Config directory
mkdir -p src/config

# Database directory
mkdir -p src/database

echo "✅ Directory structure created successfully!"

# Create .env.example file
cat > .env.example << 'EOF'
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=worker_admin
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=worker_service_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d

# Firebase Configuration (Get from Firebase Console)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@email.com
FIREBASE_PRIVATE_KEY=your-private-key

# Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Application
PORT=3000
NODE_ENV=development
EOF

echo "✅ .env.example created!"
echo "⚠️  Remember to copy .env.example to .env and fill in your actual values"
