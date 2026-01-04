import React, { createContext, useState, useContext, useEffect } from 'react';
import enTranslations from '../locales/en.json';
import bnTranslations from '../locales/bn.json';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Default to Bangla (bn) as per requirements
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'bn';
  });

  const [translations, setTranslations] = useState(() => {
    return language === 'bn' ? bnTranslations : enTranslations;
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    // Update translations when language changes
    setTranslations(language === 'bn' ? bnTranslations : enTranslations);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'bn' : 'en');
  };

  // Translation function that supports nested keys (e.g., "common.home", "auth.email")
  const t = (key, fallback = '') => {
    const keys = key.split('.');
    let value = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }
    
    return typeof value === 'string' ? value : fallback || key;
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t,
    isEnglish: language === 'en',
    isBangla: language === 'bn',
    translations,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;