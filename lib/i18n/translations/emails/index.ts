/**
 * Email translations index
 * Centralizes all email translations for OMNIA HOLIDAY TRACKER
 */

import itTranslations from './it';
import enTranslations from './en';
import esTranslations from './es';
import { Locale } from '../../config';

export const emailTranslations = {
  it: itTranslations,
  en: enTranslations,
  es: esTranslations,
} as const;

export type EmailTranslationType = typeof itTranslations;

/**
 * Get email translations for a specific locale
 */
export function getEmailTranslations(locale: Locale): EmailTranslationType {
  return emailTranslations[locale] || emailTranslations.it;
}

/**
 * Replace placeholders in email subjects
 * Example: "New employee {name}" -> "New employee John Doe"
 */
export function interpolateEmailSubject(
  template: string, 
  data: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key]?.toString() || match;
  });
}

export default emailTranslations;