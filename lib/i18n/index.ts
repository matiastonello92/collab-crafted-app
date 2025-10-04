import { it } from './translations/it';
import { en } from './translations/en';

export type Locale = 'it' | 'en' | 'fr' | 'es';
export type TranslationKey = string;

type TranslationStructure = typeof it | typeof en;

const translations: Record<Locale, TranslationStructure> = {
  it,
  en,
  fr: en, // Fallback to English
  es: en, // Fallback to English
};

let currentLocale: Locale = 'it';

export function setCurrentLocale(locale: Locale) {
  currentLocale = locale;
}

export function getCurrentLocale(): Locale {
  return currentLocale;
}

/**
 * Translation function - supports nested keys with dot notation
 * @param key - Translation key (e.g., 'recipe.title' or 'common.save')
 * @param locale - Optional locale override
 * @returns Translated string or key if not found
 */
export function t(key: string, locale?: Locale): string {
  const lang = locale || currentLocale;
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key not found: ${key} for locale: ${lang}`);
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}

/**
 * React hook for translations - use this in components for reactive locale changes
 */
export function useTranslation() {
  // Import dynamically to avoid circular dependency
  const { useLocale } = require('./LocaleProvider');
  const { locale } = useLocale();
  
  return {
    t: (key: string) => t(key, locale),
    locale,
  };
}

export { it, en };
