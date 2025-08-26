'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/hooks/useAuth';
import { LanguageSelector } from '@/components/layout/language-selector';
import { LoginLogoDisplay } from '@/components/login/login-logo-display';
import { AnimatedBackground } from '@/components/login/animated-background';

function LoginPageContent() {
  const { t } = useTranslation();
  const { login, loading, error, clearError, user, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: 'max.giurastante@omniaservices.net', // Pre-filled for testing
    password: 'admin123' // Pre-filled for testing
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectUrl = searchParams.get('redirect');
      if (redirectUrl) {
        router.push(redirectUrl);
      } else {
        // Redirect based on user role
        const dashboardUrl = user.role === 'admin' ? '/it/admin-dashboard' : '/it/employee-dashboard';
        console.log('🔄 Redirecting to:', dashboardUrl);
        router.push(dashboardUrl);
      }
    }
  }, [isAuthenticated, user, router, searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      return;
    }

    const success = await login(formData.email, formData.password);
    
    if (success) {
      // Force page reload to let middleware read cookie auth
      const redirectUrl = searchParams.get('redirect') || '/it/admin-dashboard';
      console.log('🔄 Redirecting to:', redirectUrl);
      window.location.href = redirectUrl;
    }
  };

  return (
    <div className="min-h-screen flex justify-center pt-8 pb-4 px-4 sm:px-6 lg:px-8 relative">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Language Selector in top-right corner */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>
      
      <div className="max-w-md w-full space-y-4 relative z-20">
        {/* Login Logo Display */}
        <LoginLogoDisplay />
        
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            {t('auth.login.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.login.subtitle')}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6 bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                {t('auth.login.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm disabled:bg-gray-100"
                placeholder={t('auth.login.email')}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {t('auth.login.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm disabled:bg-gray-100"
                placeholder={t('auth.login.password')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a href="#" className="font-medium text-primary hover:text-primary/90">
                {t('auth.login.forgotPassword')}
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !formData.email || !formData.password}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Accesso in corso...
                </div>
              ) : (
                t('auth.login.submit')
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="mt-2 text-sm text-gray-600">
              {t('auth.login.noAccount')}{' '}
              <a href="/it/register" className="font-medium text-primary hover:text-primary/90">
                {t('auth.login.register')}
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}