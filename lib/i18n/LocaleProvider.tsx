'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale, setCurrentLocale } from './index';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function LocaleProvider({ children, initialLocale = 'it' }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    // Load locale from localStorage on mount
    const stored = localStorage.getItem('klyra-locale') as Locale;
    if (stored && (stored === 'it' || stored === 'en')) {
      setLocaleState(stored);
      setCurrentLocale(stored);
    } else {
      setCurrentLocale(initialLocale);
    }
  }, [initialLocale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setCurrentLocale(newLocale);
    localStorage.setItem('klyra-locale', newLocale);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
