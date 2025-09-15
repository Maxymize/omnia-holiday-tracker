'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/provider';
import { locales, localeNames } from '@/lib/i18n/config';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const handleLanguageChange = (newLocale: string) => {
    console.log('🎯 LanguageSwitcher clicked:', { currentLocale: locale, newLocale, pathname });
    
    // Import session language functions
    const setSessionLanguage = (language: string) => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('session_language', language);
        sessionStorage.setItem('language_override', 'true');
      }
    };

    // Set session language override
    setSessionLanguage(newLocale);
    
    // Set cookies for session language (temporary preference)
    document.cookie = `session-language=${newLocale}; path=/; max-age=${60 * 60 * 24 * 30}`;
    document.cookie = `language-override=true; path=/; max-age=${60 * 60 * 24 * 30}`;
    
    // Language preference saved successfully

    const segments = pathname.split('/');
    segments[1] = newLocale;
    const newPath = segments.join('/');
    
    // Navigating to new language path
    router.push(newPath);
  };

  return (
    <div className={className}>
      <select
        value={locale}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="rounded-md border-gray-300 text-sm focus:border-primary-500 focus:ring-primary-500"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}