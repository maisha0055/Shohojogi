// ============================================
// FILE: src/components/Footer.tsx
// ============================================
export default function Footer() {
    return (
      <footer className="bg-gray-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Worker Service</h3>
              <p className="text-gray-400">
                Connecting skilled workers with customers in need of quality services.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li>About Us</li>
                <li>Services</li>
                <li>Contact</li>
                <li>Privacy Policy</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Email: info@workerservice.com</li>
                <li>Phone: +880 1700-000000</li>
                <li>Address: Dhaka, Bangladesh</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Worker Service Platform. All rights reserved.</p>
            <p className="mt-2 text-sm">Module 1 - Created by Team</p>
          </div>
        </div>
      </footer>
    );
  }