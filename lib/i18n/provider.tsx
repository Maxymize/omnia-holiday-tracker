'use client';

import { createContext, useContext, ReactNode } from 'react';
import { translations } from './index';
import { Locale } from './config';

type TranslationFunction = (key: string, params?: Record<string, string>) => string;

interface I18nContextType {
  locale: Locale;
  t: TranslationFunction;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: string;
}) {
  const validLocale = (locale as Locale) || 'it';

  const t: TranslationFunction = (key: string, params?: Record<string, string>) => {
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

  return (
    <I18nContext.Provider value={{ locale: validLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}

// Export alias for consistency
export const useI18n = useTranslation;