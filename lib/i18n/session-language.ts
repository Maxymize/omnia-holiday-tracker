'use client';

/**
 * Gestione della lingua di sessione (temporanea)
 * Separata dalla lingua del profilo (permanente per email)
 */

const SESSION_LANGUAGE_KEY = 'session-language';
const LANGUAGE_OVERRIDE_KEY = 'language-override';

export function setSessionLanguage(language: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_LANGUAGE_KEY, language);
    // Mark that user has manually overridden language
    sessionStorage.setItem(LANGUAGE_OVERRIDE_KEY, 'true');
  }
}

export function getSessionLanguage(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(SESSION_LANGUAGE_KEY);
  }
  return null;
}

export function hasLanguageOverride(): boolean {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(LANGUAGE_OVERRIDE_KEY) === 'true';
  }
  return false;
}

export function clearLanguageOverride() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_LANGUAGE_KEY);
    sessionStorage.removeItem(LANGUAGE_OVERRIDE_KEY);
  }
}

export function shouldUseProfileLanguage(): boolean {
  return !hasLanguageOverride();
}