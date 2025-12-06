// ============================================
// FILE: src/pages/Home.tsx
// ============================================
import { Link } from 'react-router-dom';
import { Search, Users, Shield, Star } from 'lucide-react';

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Find Skilled Workers Near You
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Connect with verified professionals for all your service needs
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/search-workers" className="btn-primary bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3">
                Find Workers
              </Link>
              <Link to="/register" className="btn-secondary bg-primary-700 text-white hover:bg-primary-800 text-lg px-8 py-3">
                Join as Worker
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose Us?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Search</h3>
              <p className="text-gray-600">
                Find workers by location, skills, and ratings with our advanced search system
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Verified Workers</h3>
              <p className="text-gray-600">
                All workers are verified with proper documentation for your safety
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Quality Service</h3>
              <p className="text-gray-600">
                Read reviews and ratings from real customers to make informed decisions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Popular Services
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {['Carpenter', 'Electrician', 'Plumber', 'Mechanic', 'Painter', 'AC Technician', 'Gardener', 'Key Maker'].map((service) => (
              <Link
                key={service}
                to="/search-workers"
                className="card text-center hover:shadow-xl transition-shadow"
              >
                <div className="text-4xl mb-3">🔧</div>
                <h3 className="font-semibold">{service}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Join thousands of satisfied customers and workers
          </p>
          <Link to="/register" className="btn-primary bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3">
            Sign Up Now
          </Link>
        </div>
      </section>
    </div>
  );
}