export const locales = ['it', 'en', 'es'] as const;
export const defaultLocale = 'it';

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
};