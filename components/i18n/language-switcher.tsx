'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/provider';
import { locales, localeNames } from '@/lib/i18n/config';
import { addLocaleToPathname } from '@/lib/i18n/utils';

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const handleLanguageChange = (newLocale: string) => {
    const newPathname = addLocaleToPathname(pathname, newLocale);
    
    // Set locale cookie
    document.cookie = `locale=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    
    // Navigate to new locale
    router.push(newPathname);
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