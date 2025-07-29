"use client";
import { createContext, useContext } from 'react';
import { locales, defaultLocale, type Locale } from './i18n-config';

// Re-export for backward compatibility
export { locales, defaultLocale, type Locale };

// Translation types
export interface Translations {
  [key: string]: string | Translations;
}

// Translation cache
const translationCache = new Map<string, Translations>();

// Load translations function
export async function loadTranslations(locale: Locale, namespace: string): Promise<Translations> {
  const cacheKey = `${locale}-${namespace}`;
  
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(`/locales/${locale}/${namespace}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load translations for ${locale}/${namespace}`);
    }
    
    const translations = await response.json();
    translationCache.set(cacheKey, translations);
    return translations;
  } catch (error) {
    console.warn(`Failed to load translations for ${locale}/${namespace}:`, error);
    
    // Fallback to default locale if current locale fails
    if (locale !== defaultLocale) {
      return loadTranslations(defaultLocale, namespace);
    }
    
    return {};
  }
}

// Get nested translation value
export function getTranslation(translations: Translations, key: string, defaultValue?: string): string {
  const keys = key.split('.');
  let current: any = translations;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return defaultValue || key;
    }
  }
  
  return typeof current === 'string' ? current : defaultValue || key;
}

// Translation context
export interface I18nContextType {
  locale: Locale;
  translations: Record<string, Translations>;
  setLocale: (locale: Locale) => void;
  t: (key: string, defaultValue?: string, namespace?: string) => string;
}

export const I18nContext = createContext<I18nContextType | null>(null);

// Custom hook to use translations
export function useTranslation(namespace: string = 'common') {
  const context = useContext(I18nContext);
  
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  
  const { locale, translations, setLocale } = context;
  
  const t = (key: string, defaultValue?: string) => {
    const namespaceTranslations = translations[namespace] || {};
    return getTranslation(namespaceTranslations, key, defaultValue);
  };
  
  return {
    t,
    locale,
    setLocale,
  };
}

// Get locale from pathname
export function getLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  
  if (locales.includes(firstSegment as Locale)) {
    return firstSegment as Locale;
  }
  
  return defaultLocale;
}

// Get pathname without locale
export function getPathnameWithoutLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
    return '/' + segments.slice(1).join('/');
  }
  
  return pathname;
}

// Get pathname with locale
export function getPathnameWithLocale(pathname: string, locale: Locale): string {
  const pathnameWithoutLocale = getPathnameWithoutLocale(pathname);
  
  if (locale === defaultLocale) {
    return pathnameWithoutLocale || '/';
  }
  
  return `/${locale}${pathnameWithoutLocale}`;
}

// Detect user's preferred language
export function detectLocale(): Locale {
  // Check localStorage first
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('preferred-language');
    if (stored && locales.includes(stored as Locale)) {
      return stored as Locale;
    }
    
    // Check browser language
    const browserLang = navigator.language.split('-')[0];
    if (locales.includes(browserLang as Locale)) {
      return browserLang as Locale;
    }
  }
  
  return defaultLocale;
}