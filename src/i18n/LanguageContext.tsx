import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SupportedLanguage, translations, TranslationKey } from './translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage, userId?: string) => void;
  syncUserLanguage: (userLang?: string, hasSelected?: boolean) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
  isLanguageModalOpen: boolean;
  openLanguageModal: () => void;
  closeLanguageModal: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('nbs_app_language') as SupportedLanguage;
    if (saved && ['ar', 'en', 'fr', 'ru', 'es'].includes(saved)) {
      return saved;
    }
    // Auto-detect Telegram WebApp language or browser language
    const tgLang = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    if (tgLang) {
      if (tgLang.startsWith('ar')) return 'ar';
      if (tgLang.startsWith('fr')) return 'fr';
      if (tgLang.startsWith('ru')) return 'ru';
      if (tgLang.startsWith('es')) return 'es';
      if (tgLang.startsWith('en')) return 'en';
    }
    const navLang = navigator.language || '';
    if (navLang.startsWith('ar')) return 'ar';
    if (navLang.startsWith('fr')) return 'fr';
    if (navLang.startsWith('ru')) return 'ru';
    if (navLang.startsWith('es')) return 'es';
    return 'ar'; // Default to Arabic as primary
  });

  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState<boolean>(() => {
    // Show on first time launch for new users only
    const hasChosen = localStorage.getItem('nbs_has_selected_lang');
    return !hasChosen;
  });

  const isRTL = language === 'ar';

  useEffect(() => {
    // Sync HTML document direction and lang attribute
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const setLanguage = useCallback((newLang: SupportedLanguage, userId?: string) => {
    setLanguageState(newLang);
    localStorage.setItem('nbs_app_language', newLang);
    localStorage.setItem('nbs_has_selected_lang', 'true');
    setIsLanguageModalOpen(false);

    if (userId) {
      fetch(`/api/user/${userId}/language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLang }),
      }).catch(() => {});
    }
  }, []);

  const syncUserLanguage = useCallback((userLang?: string, hasSelected?: boolean) => {
    if (hasSelected) {
      localStorage.setItem('nbs_has_selected_lang', 'true');
      setIsLanguageModalOpen(false);
    }
    if (userLang && ['ar', 'en', 'fr', 'ru', 'es'].includes(userLang)) {
      setLanguageState(userLang as SupportedLanguage);
      localStorage.setItem('nbs_app_language', userLang);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const langDict = translations[language] || translations['en'];
      return (langDict as any)[key] || (translations['en'] as any)[key] || key;
    },
    [language]
  );

  const openLanguageModal = () => setIsLanguageModalOpen(true);
  const closeLanguageModal = () => {
    localStorage.setItem('nbs_has_selected_lang', 'true');
    setIsLanguageModalOpen(false);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        syncUserLanguage,
        t,
        isRTL,
        isLanguageModalOpen,
        openLanguageModal,
        closeLanguageModal,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
