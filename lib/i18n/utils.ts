import { locales, defaultLocale, type Locale } from './config';

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getValidLocale(locale: string): Locale {
  return isValidLocale(locale) ? locale : defaultLocale;
}

export function generateAlternateLinks(pathname: string, currentLocale: string) {
  return locales.map((locale) => ({
    locale,
    href: pathname.replace(`/${currentLocale}`, `/${locale}`),
    hreflang: locale,
    isActive: locale === currentLocale,
  }));
}

export function getPathnameWithoutLocale(pathname: string): string {
  const localePattern = new RegExp(`^/(${locales.join('|')})`);
  return pathname.replace(localePattern, '') || '/';
}

export function addLocaleToPathname(pathname: string, locale: string): string {
  const cleanPathname = getPathnameWithoutLocale(pathname);
  return `/${locale}${cleanPathname === '/' ? '' : cleanPathname}`;
}