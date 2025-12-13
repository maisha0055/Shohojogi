import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'bn' : 'en');
  };

  const t = (translations) => {
    return translations[language] || translations['en'] || '';
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    isEnglish: language === 'en',
    isBangla: language === 'bn',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;

// Translation helper
export const translations = {
  // Common
  welcome: { en: 'Welcome', bn: 'স্বাগতম' },
  home: { en: 'Home', bn: 'হোম' },
  login: { en: 'Login', bn: 'লগইন' },
  register: { en: 'Register', bn: 'নিবন্ধন' },
  logout: { en: 'Logout', bn: 'লগআউট' },
  search: { en: 'Search', bn: 'খুঁজুন' },
  filter: { en: 'Filter', bn: 'ফিল্টার' },
  
  // Booking
  bookNow: { en: 'Book Now', bn: 'এখনই বুক করুন' },
  instantBooking: { en: 'Instant Booking', bn: 'তাৎক্ষণিক বুকিং' },
  scheduledBooking: { en: 'Scheduled Booking', bn: 'নির্ধারিত বুকিং' },
  
  // Status
  available: { en: 'Available', bn: 'উপলব্ধ' },
  busy: { en: 'Busy', bn: 'ব্যস্ত' },
  offline: { en: 'Offline', bn: 'অফলাইন' },
  
  // Actions
  submit: { en: 'Submit', bn: 'জমা দিন' },
  cancel: { en: 'Cancel', bn: 'বাতিল' },
  confirm: { en: 'Confirm', bn: 'নিশ্চিত করুন' },
  edit: { en: 'Edit', bn: 'সম্পাদনা' },
  delete: { en: 'Delete', bn: 'মুছুন' },
  save: { en: 'Save', bn: 'সংরক্ষণ' },
};