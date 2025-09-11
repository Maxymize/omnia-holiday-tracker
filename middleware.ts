import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from '@/lib/i18n/config';
import { getUserFromToken } from '@/lib/auth/jwt-utils';
import { getUserById } from '@/lib/db/helpers';

// Supported locales
const supportedLocales = locales;

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/register', '/api/auth/login', '/api/auth/register'];

// Admin-only routes
const adminRoutes = ['/admin'];

// Function to get user's preferred language from database
async function getUserPreferredLanguage(authToken?: string): Promise<string | null> {
  if (!authToken) return null;
  
  try {
    const userInfo = await getUserFromToken(undefined, authToken);
    if (!userInfo?.userId) return null;
    
    const user = await getUserById(userInfo.userId);
    return user?.preferredLanguage || null;
  } catch (error) {
    console.log('Failed to get user preferred language:', error);
    return null;
  }
}

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

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Skip middleware for API routes, static files, Next.js internals, and RSC requests
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') ||
    pathname.startsWith('/.netlify/') ||
    request.nextUrl.searchParams.has('_rsc') || // Skip RSC requests
    request.headers.get('RSC') === '1' || // Skip RSC requests
    request.headers.get('Next-Router-Prefetch') === '1' // Skip prefetch requests
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

  // Extract path without locale for route checking
  const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';

  // Check if route requires authentication
  const isPublicRoute = publicRoutes.some(route => 
    route === pathWithoutLocale || 
    pathWithoutLocale.startsWith('/api/') ||
    pathWithoutLocale === '/login' ||
    pathWithoutLocale === '/register'
  );

  // Skip auth check for public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Get auth token from cookies (priority) or authorization header (fallback)
  const cookieToken = request.cookies.get('auth-token')?.value;
  const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const authToken = cookieToken || headerToken;

  console.log('🔍 Auth Debug:', {
    cookieToken: cookieToken ? 'PRESENT' : 'MISSING',
    headerToken: headerToken ? 'PRESENT' : 'MISSING',
    finalToken: authToken ? 'PRESENT' : 'MISSING',
    path: pathname
  });

  // If no token found, redirect to login
  if (!authToken) {
    console.log('🚫 No auth token found, redirecting to login');
    const loginUrl = new URL(`/${locale}/login`, request.url);
    // Only add redirect parameter if we're not already on login page
    if (!pathname.includes('/login')) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify token and get user info - pass token directly since it's from cookie
    console.log('🔍 Middleware - About to verify token:', {
      tokenLength: authToken?.length,
      tokenStart: authToken?.substring(0, 20),
      tokenEnd: authToken?.substring(authToken.length - 10)
    });
    
    const userInfo = await getUserFromToken(undefined, authToken);
    
    console.log('🔍 Middleware - getUserFromToken result:', userInfo);
    
    if (!userInfo) {
      console.log('❌ Middleware - userInfo is null/undefined');
      throw new Error('Invalid token');
    }

    console.log(`✅ Authenticated user: ${userInfo.email} (${userInfo.role})`);

    // Check admin-only routes
    const isAdminRoute = adminRoutes.some(route => pathWithoutLocale.startsWith(route));
    
    if (isAdminRoute && userInfo.role !== 'admin') {
      console.log(`🚫 Non-admin user ${userInfo.email} trying to access admin route`);
      // Redirect non-admin users to employee dashboard
      return NextResponse.redirect(new URL(`/${locale}/employee-dashboard`, request.url));
    }

    // Check if user has a preferred language different from current locale
    try {
      const userPreferredLanguage = await getUserPreferredLanguage(authToken);
      if (userPreferredLanguage && userPreferredLanguage !== locale && supportedLocales.includes(userPreferredLanguage as any)) {
        console.log(`🌍 Redirecting user to preferred language: ${userPreferredLanguage} (current: ${locale})`);
        
        // Redirect to the same path but with user's preferred language
        const redirectUrl = new URL(`/${userPreferredLanguage}${pathWithoutLocale}${search}`, request.url);
        const response = NextResponse.redirect(redirectUrl);
        
        // Update locale cookie to match user preference
        response.cookies.set('locale', userPreferredLanguage, {
          maxAge: 60 * 60 * 24 * 365, // 1 year
          httpOnly: true,
          sameSite: 'lax',
        });
        
        return response;
      }
    } catch (error) {
      console.log('Error checking user preferred language:', error);
      // Continue without redirecting if there's an error
    }

    // Authentication successful - continue
    return NextResponse.next();

  } catch (error) {
    console.error('🚨 Auth middleware error:', error);
    
    // Token invalid - redirect to login
    const loginUrl = new URL(`/${locale}/login`, request.url);
    // Only add redirect parameter if we're not already on login page
    if (!pathname.includes('/login')) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    
    const response = NextResponse.redirect(loginUrl);
    
    // Clear invalid tokens
    response.cookies.delete('auth-token');
    response.cookies.delete('refresh-token');
    
    return response;
  }
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
  ]
};