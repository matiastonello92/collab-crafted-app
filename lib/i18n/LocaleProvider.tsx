'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale, setCurrentLocale } from './index';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isMounted: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function LocaleProvider({ children, initialLocale = 'it' }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    let initialLoc: Locale = initialLocale;
    
    // Initialize from localStorage if available (client-side only)
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('klyra-locale') as Locale;
      if (stored && (stored === 'it' || stored === 'en')) {
        initialLoc = stored;
      }
    }
    
    return initialLoc;
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setCurrentLocale(locale);
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setCurrentLocale(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('klyra-locale', newLocale);
    }
  };

  // Always provide context, even during SSR
  return (
    <LocaleContext.Provider value={{ locale, setLocale, isMounted }}>
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
