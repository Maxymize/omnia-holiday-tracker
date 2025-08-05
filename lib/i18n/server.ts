import { translations } from './index';
import { Locale, defaultLocale } from './config';

export function getTranslations(locale: string) {
  const validLocale = (locale as Locale) || defaultLocale;
  
  const t = (key: string, params?: Record<string, string>) => {
    const keys = key.split('.');
    let value: any = translations[validLocale];

    for (const k of keys) {
      value = value?.[k];
      if (!value) {
        console.warn(`Translation key not found: ${key} for locale: ${validLocale}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation key is not a string: ${key}`);
      return key;
    }

    // Replace parameters like {{name}} with actual values
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue);
      });
    }

    return value;
  };

  return { t, locale: validLocale };
}