# 🏗️ Shohojogi - Local Service Worker Platform 

> **A full-stack platform connecting users with trusted local workers. Providing reliable service listings, seamless interactions, and modern workflow efficiency for Bangladesh.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit-blue?style=flat-square)](https://shohojogi-beta.vercel.app/)
[![Repository](https://img.shields.io/badge/Repository-GitHub-black?style=flat-square)](https://github.com/maisha0055/Shohojogi)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Features in Detail](#features-in-detail)
- [Security & Safety](#security--safety)
- [Contributing](#contributing)
- [Support](#support)

---

## 🎯 Overview

**Shohojogi** (শহজোগী - meaning "Easy Service" in Bengali) is an innovative platform designed to bridge the gap between service seekers and skilled local workers. Whether you need an electrician, plumber, carpenter, mechanic, or other home services, Shohojogi makes it easy to find, book, and manage services efficiently.

Inspired by ride-sharing platforms like Uber, Shohojogi adapts the model for home services, enabling workers to maximize their earnings while giving users access to verified, reliable professionals.

### 🎪 Platform Goals
- **Trust & Verification**: Advanced worker verification using AI and admin oversight
- **Accessibility**: Bangla language support and mobile-first design
- **Efficiency**: Real-time notifications, instant job matching, and automated workflows
- **Safety**: Emergency contact features, fraud detection, and community reporting systems

---

## ✨ Key Features

### 👤 User & Worker Profiles
- **Profile Management**: Update personal info, photos, contact details, and addresses
- **Favorites/Bookmarks**: Save trusted workers for future reference
- **Rating & Reviews**: Leave feedback after service completion
- **User Loyalty Points**: Earn rewards for completed jobs and unlock discounts

### 🔍 Discovery & Search
- **Service Categories**: Organized list of professions (Carpenter, Mechanic, Electrician, Plumber, Key Maker, etc.)
- **Advanced Search & Filtering**: Find workers by location, skill, rating, or availability
- **Location-Map Integration**: Interactive Google Maps and Leaflet integration for visual worker locations
- **Availability Status**: Workers can mark themselves as "Available" or "Busy"

### 📅 Booking System
- **Service Requests**: Send detailed requests with date, time, and job specifications
- **Automated Price Estimation**: Smart pricing through APIs
- **Job Alerts for Workers**: Real-time notifications with essential job details
- **Accept/Reject Workflow**: Workers can quickly accept or reject jobs to find next available professional

### 💬 Communication
- **Real-Time Chat**: In-app messaging powered by Socket.io
- **Direct Call Option**: "Call Now" button for immediate communication
- **Notifications**: Real-time alerts for requests, approvals, and messages

### 🛡️ Security & Verification
- **Advanced Worker Verification System**:
  - Workers upload NID (National ID) image
  - Google Gemini API extracts and validates data (Name, NID Number)
  - Automatic comparison with profile details
  - Admin final approval for verified status
- **Fraud Detection Alerts**: Automatic flags for suspicious activity (fake reviews, etc.)
- **Report & Support System**: Users/workers can report profiles; admin reviews and takes action
- **Emergency Contact Feature**: Safety-focused direct support

### 💳 Payment Integration
- **Multiple Payment Options**: Cash or Online payments
- **Payment Gateways**: bKash, Nagad, and Stripe integration
- **Secure Transactions**: Helmet-protected API endpoints

### 📢 Engagement Features
- **In-App Tutorials**: Guided walkthroughs for new users
- **Multilingual Support**: English and Bangla language toggle
- **Blog & News Section**: Posts on home maintenance, safety tips, and DIY guides
- **Q&A/Training Section**: Educational resources for users and workers

### 🤖 AI Integration
- **Gemini AI**: Intelligent NID verification and document processing
- **Face API**: Enhanced identity verification and fraud prevention
- **Smart Notifications**: Contextual alerts and recommendations

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19.0
- **Routing**: React Router DOM 7.0
- **Styling**: Tailwind CSS
- **UI Components**: Heroicons React
- **Maps**: Leaflet + React-Leaflet, Google Maps API
- **Real-time Communication**: Socket.io Client
- **HTTP Client**: Axios
- **Notifications**: React Toastify
- **Date Handling**: date-fns
- **Media**: React Webcam
- **AI/ML**: Face-API

### Backend
- **Runtime**: Node.js (≥18.0.0)
- **Framework**: Express.js
- **Database**: PostgreSQL (pg)
- **Real-time**: Socket.io
- **AI/ML**: Google Generative AI (Gemini), Face-API
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, Helmet
- **File Upload**: Multer, Cloudinary
- **Validation**: Express Validator
- **Email**: Nodemailer
- **Utilities**: Axios, UUID
- **Logging**: Morgan
- **CORS**: Express CORS

### Database
- **Primary**: PostgreSQL with PlPgSQL procedures
- **Cloud Storage**: Cloudinary for images

---

## 📁 Project Structure

```
Shohojogi/
├── backend/                          # Express.js API Server
│   ├── server.js                    # Entry point
│   ├── package.json                 # Backend dependencies
│   ├── routes/                      # API route handlers
│   ├── controllers/                 # Business logic
│   ├── models/                      # Database schemas
│   ├── middleware/                  # Authentication, validation
│   ├── utils/                       # Helper functions
│   ├── scripts/                     # Seed data, migrations
│   │   ├── seedBlogs.js            # Blog seeding
│   │   └── runMigration.js         # Loyalty points migration
│   └── .env.example                # Environment template
│
├── worker-calling-frontend/         # React.js Frontend
│   ├── public/                      # Static files
│   ├── src/
│   │   ├── App.js                  # Root component
│   │   ├── index.js                # React DOM render
│   │   ├── pages/                  # Page components
│   │   ├── components/             # Reusable components
│   │   ├── services/               # API calls
│   │   ├── context/                # React Context
│   │   ├── styles/                 # CSS/Tailwind
│   │   └── assets/                 # Images, icons
│   ├── package.json                # Frontend dependencies
│   ├── .env.example                # Environment template
│   └── tailwind.config.js          # Tailwind configuration
│
└── README.md                        # This file
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js** v18.0.0 or higher ([Download](https://nodejs.org/))
- **npm** v9.0.0 or higher
- **PostgreSQL** 12+ ([Download](https://www.postgresql.org/))
- **Git** ([Download](https://git-scm.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/maisha0055/Shohojogi.git
   cd Shohojogi
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../worker-calling-frontend
   npm install
   ```

### Environment Setup

#### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/shohojogi
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shohojogi
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRY=7d

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Email Service (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
SMTP_SERVICE=gmail

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Payment Gateway
STRIPE_SECRET_KEY=your_stripe_secret
BKASH_API_KEY=your_bkash_key
NAGAD_API_KEY=your_nagad_key

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:3000

# Admin Email
ADMIN_EMAIL=admin@shohojogi.com
```

#### Frontend Environment Variables

Create a `.env` file in the `worker-calling-frontend/` directory:

```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000

# Google Maps API
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Environment
REACT_APP_ENV=development
```

### Running the Application

#### Option 1: Run Both Services Separately

**Terminal 1 - Backend**
```bash
cd backend
npm run dev        # Development mode with Nodemon
# OR
npm start          # Production mode
```
Backend will run on: `http://localhost:5000`

**Terminal 2 - Frontend**
```bash
cd worker-calling-frontend
npm start
```
Frontend will run on: `http://localhost:3000`

#### Option 2: Initialize Database

Before running, set up the PostgreSQL database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE shohojogi;

# Run migrations (if you have migration files)
cd backend
npm run migrate:loyalty
npm run seed:blogs
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Main Endpoints

#### Authentication
- `POST /auth/register` - Register new user/worker
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get current user profile

#### Workers
- `GET /workers` - List all workers
- `GET /workers/:id` - Get worker details
- `PUT /workers/:id` - Update worker profile
- `POST /workers/verify` - Submit NID for verification
- `GET /workers/:id/availability` - Get worker availability

#### Services/Categories
- `GET /services` - List all service categories
- `GET /services/:id` - Get service details

#### Bookings
- `POST /bookings` - Create service request
- `GET /bookings` - Get user bookings
- `PUT /bookings/:id` - Update booking status
- `POST /bookings/:id/accept` - Worker accepts job
- `POST /bookings/:id/reject` - Worker rejects job

#### Ratings & Reviews
- `POST /ratings` - Submit rating/review
- `GET /ratings/:workerId` - Get worker ratings

#### Payments
- `POST /payments` - Create payment
- `GET /payments/:id` - Get payment details

#### Chat & Notifications
- `GET /messages/:conversationId` - Get messages
- `POST /messages` - Send message
- `GET /notifications` - Get user notifications

---

## 🗄️ Database Schema

### Key Tables

**users**
- id, email, password, name, phone, address, photo_url, created_at

**workers**
- id, user_id, service_type, availability, rating, verification_status, nid_number, nid_verified_at

**service_categories**
- id, name, description, icon_url

**bookings**
- id, user_id, worker_id, service_id, status, date, time, location, price, created_at

**ratings_reviews**
- id, booking_id, user_id, worker_id, rating, review_text, created_at

**payments**
- id, booking_id, amount, method, status, transaction_id, created_at

**messages**
- id, sender_id, receiver_id, content, timestamp

**notifications**
- id, user_id, type, content, is_read, created_at

---

## 🎯 Features in Detail

### 🔐 Worker Verification System
1. Worker uploads National ID (NID) image
2. Google Gemini API extracts information (Name, NID Number)
3. System auto-validates against profile data
4. Admin reviews and approves verification
5. Worker status updated to "Verified"

### 💼 Job Alert System
- Worker receives notification with:
  - Service type
  - Customer location
  - Preferred date/time
- Worker can:
  - **Accept**: Confirms availability and schedules
  - **Reject**: Request sent to next available worker

### 🏆 Loyalty Points System
- Users earn 1 point per completed job
- Points can be redeemed for discounts
- Database migration: `npm run migrate:loyalty`

### 🚨 Safety Features
- Emergency contact in case of safety concerns
- Report worker/user profiles for misconduct
- Fraud detection alerts for suspicious patterns
- Admin dashboard for complaint review

---

## 🛡️ Security & Safety

### Authentication
- JWT-based authentication
- Bcryptjs password hashing
- Token expiration and refresh

### API Security
- Helmet.js for HTTP headers
- Express Validator for input validation
- CORS protection
- Rate limiting (recommended)

### Data Protection
- PostgreSQL secure password hashing
- Encrypted sensitive data in transit (HTTPS recommended)
- Secure file uploads via Cloudinary

### AI-Powered Verification
- Google Gemini API for document verification
- Face-API for identity matching
- Automatic fraud flagging

---

## 🤝 Contributing

We welcome contributions! Follow these steps:

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Shohojogi.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/YourFeatureName
   ```

3. **Commit your changes**
   ```bash
   git commit -m "Add: Description of your feature"
   ```

4. **Push to your branch**
   ```bash
   git push origin feature/YourFeatureName
   ```

5. **Open a Pull Request**
   - Describe what you've added/fixed
   - Link any related issues
   - Wait for review

### Development Best Practices
- Follow existing code style
- Write meaningful commit messages
- Test features locally before pushing
- Update documentation for new features

---

## 📞 Support & Communication

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/maisha0055/Shohojogi/issues)
- **Discussions**: [GitHub Discussions](https://github.com/maisha0055/Shohojogi/discussions)
- **Live Demo**: [Shohojogi Beta](https://shohojogi-beta.vercel.app/)

### Contact
- **Repository Owner**: [@maisha0055](https://github.com/maisha0055)
- **License**: MIT

---

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 🎓 Additional Resources

- [React Documentation](https://react.dev)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Google Gemini API](https://ai.google.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 🚀 Roadmap

- [ ] Mobile app (React Native/Flutter)
- [ ] Advanced analytics dashboard
- [ ] AI-powered worker recommendations
- [ ] Multi-language support expansion
- [ ] Integration with government verification systems
- [ ] Subscription plans for premium workers
- [ ] Advanced scheduling and calendar integration
- [ ] Video call feature for consultations

---

<div align="center">

**Made with ❤️ for Bangladesh's service industry**

![GitHub Stars](https://img.shields.io/github/stars/maisha0055/Shohojogi?style=social)
![GitHub Forks](https://img.shields.io/github/forks/maisha0055/Shohojogi?style=social)

</div>
