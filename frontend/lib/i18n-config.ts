// Server-side i18n configuration
export const locales = ['en', 'zh'] as const;
export type Locale = typeof locales[number];

// Default locale
export const defaultLocale: Locale = 'en';