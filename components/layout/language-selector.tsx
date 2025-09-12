'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { setSessionLanguage } from '@/lib/i18n/session-language';

const languages = [
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

export function LanguageSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useTranslation();

  const handleLanguageChange = (newLocale: string) => {
    console.log('🎯 Language selector clicked:', { currentLocale: locale, newLocale, pathname });
    
    // Set session language (temporary override)
    setSessionLanguage(newLocale);
    
    // Set cookies for middleware to read
    document.cookie = `session-language=${newLocale}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days
    document.cookie = `language-override=true; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days
    
    console.log('🍪 Cookies set:', {
      sessionLanguage: newLocale,
      override: true,
      allCookies: document.cookie
    });
    
    // Get the current path without the locale
    const segments = pathname.split('/');
    segments[1] = newLocale; // Replace the locale segment
    const newPath = segments.join('/');
    
    console.log('🚀 Navigating to:', newPath);
    
    router.push(newPath);
  };

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage.flag} {currentLanguage.name}</span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={locale === lang.code ? 'bg-gray-100' : ''}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}