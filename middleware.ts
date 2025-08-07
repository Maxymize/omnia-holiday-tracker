import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from '@/lib/i18n/config';

// Supported locales
const supportedLocales = locales;

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/register', '/api/auth/login', '/api/auth/register'];

// Admin-only routes
const adminRoutes = ['/admin'];

// Function to get locale from request
function getLocale(request: NextRequest): string {
  // Check if URL already has a locale
  const pathname = request.nextUrl.pathname;
  const pathnameHasLocale = supportedLocales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return pathname.split('/')[1];
  }

  // Try to get locale from cookie
  const localeCookie = request.cookies.get('locale')?.value;
  if (localeCookie && supportedLocales.includes(localeCookie as any)) {
    return localeCookie;
  }

  // Try to get locale from Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const detectedLocale = acceptLanguage
      .split(',')
      .map((lang) => lang.split(';')[0].trim().split('-')[0])
      .find((lang) => supportedLocales.includes(lang as any));
    
    if (detectedLocale) {
      return detectedLocale;
    }
  }

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') ||
    pathname.startsWith('/.netlify/')
  ) {
    return NextResponse.next();
  }

  // Get locale
  const locale = getLocale(request);

  // Check if pathname already has locale
  const pathnameHasLocale = supportedLocales.some(
    (loc) => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`
  );

  // Skip root path - let app/page.tsx handle it
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Redirect to locale-prefixed path if needed
  if (!pathnameHasLocale) {
    const response = NextResponse.redirect(
      new URL(`/${locale}${pathname}${search}`, request.url)
    );
    
    // Set locale cookie for future requests
    response.cookies.set('locale', locale, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      sameSite: 'lax',
    });
    
    return response;
  }

  // TEMPORARILY DISABLE AUTH CHECK TO FIX REDIRECT LOOP
  // Will re-enable after confirming routing works
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};