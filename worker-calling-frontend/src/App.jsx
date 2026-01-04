// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Navbar from './components/common/Navbar';
import ScrollToTop from './components/common/ScrollToTop';
import WorkerCallDetailsButton from './components/booking/WorkerCallDetailsButton';
import Footer from './components/common/Footer';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import WorkerSearch from './pages/WorkerSearch';
import WorkerDetails from './pages/WorkerDetails';
import UserDashboard from './pages/UserDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import WorkerOnboarding from './pages/WorkerOnboarding';
import WorkerSlots from './pages/WorkerSlots';
import BookingPage from './pages/BookingPage';
import MyBookings from './pages/MyBookings';
import Chat from './pages/Chat';
import AdminDashboard from './pages/AdminDashboard';
import CallWorker from './pages/CallWorker';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import BlogDetail from './pages/BlogDetail';
import Blogs from './pages/Blogs';
import PaymentSuccess from './pages/PaymentSuccess';
import Shop from './pages/Shop';
import ShopCart from './pages/ShopCart';
import ShopCheckout from './pages/ShopCheckout';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <Router>
              <ScrollToTop />
              <div className="flex flex-col min-h-screen bg-gray-50">
                <Navbar />
                <main className="flex-grow">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/workers" element={<WorkerSearch />} />
                    <Route path="/workers/:id" element={<WorkerDetails />} />
                    <Route path="/blogs" element={<Blogs />} />
                    <Route path="/blogs/:id" element={<BlogDetail />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route
                      path="/shop-checkout"
                      element={
                        <ProtectedRoute allowedRoles={['user']}>
                          <ShopCheckout />
                        </ProtectedRoute>
                      }
                    />

                    {/* Payment Routes */}
                    <Route
                      path="/payment/success"
                      element={
                        <ProtectedRoute allowedRoles={['user', 'admin']}>
                          <PaymentSuccess />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected User Routes */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['user']}>
                          <UserDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/bookings"
                      element={
                        <ProtectedRoute allowedRoles={['user', 'worker']}>
                          <MyBookings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/booking/:workerId"
                      element={
                        <ProtectedRoute allowedRoles={['user']}>
                          <BookingPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/call-worker"
                      element={
                        <ProtectedRoute allowedRoles={['user']}>
                          <CallWorker />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/cart"
                      element={
                        <ProtectedRoute allowedRoles={['user']}>
                          <Cart />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/shop-cart"
                      element={
                        <ProtectedRoute allowedRoles={['user']}>
                          <ShopCart />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/checkout"
                      element={
                        <ProtectedRoute allowedRoles={['user']}>
                          <Checkout />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/chat"
                      element={
                        <ProtectedRoute allowedRoles={['user', 'worker']}>
                          <Chat />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected Worker Routes */}
                    <Route
                      path="/worker-onboarding"
                      element={
                        <ProtectedRoute allowedRoles={['worker']}>
                          <WorkerOnboarding />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/worker-slots"
                      element={
                        <ProtectedRoute allowedRoles={['worker']}>
                          <WorkerSlots />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/worker-dashboard"
                      element={
                        <ProtectedRoute allowedRoles={['worker']}>
                          <WorkerDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected Admin Routes */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Catch all - redirect to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
                <Footer />
              </div>

              {/* Toast Notifications */}
              <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
              />

              {/* Worker Call Details Button - Floating popup button for workers */}
              <WorkerCallDetailsButton />
            </Router>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;