import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-bold mb-4">WorkerCall</h3>
            <p className="text-gray-400 text-sm">
              {t('footer.about')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white text-sm">
                  {t('common.home')}
                </Link>
              </li>
              <li>
                <Link to="/workers" className="text-gray-400 hover:text-white text-sm">
                  {t('common.findWorkers')}
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-400 hover:text-white text-sm">
                  {t('home.becomeWorker')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-bold mb-4">{t('footer.services')}</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>{t('footer.electrician')}</li>
              <li>{t('footer.plumber')}</li>
              <li>{t('footer.carpenter')}</li>
              <li>{t('footer.mechanic')}</li>
              <li>{t('footer.acTechnician')}</li>
              <li>{t('footer.cleaningService')}</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-4">{t('footer.contactUs')}</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>{t('footer.email')}: info@workercall.com</li>
              <li>{t('footer.phone')}: +880 1700-000000</li>
              <li>{t('footer.address')}: Dhaka, Bangladesh</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} WorkerCall. {t('footer.allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;