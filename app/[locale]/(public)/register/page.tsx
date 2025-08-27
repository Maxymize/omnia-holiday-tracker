'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/provider';
import { LanguageSelector } from '@/components/layout/language-selector';
import { LoginLogoDisplay } from '@/components/login/login-logo-display';
import { AnimatedBackground } from '@/components/login/animated-background';
import { useCompanyName } from '@/lib/hooks/useCompanyName';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { companyName, loading: companyLoading } = useCompanyName();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.register.passwordMismatch'));
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('La password deve avere almeno 8 caratteri');
      setIsLoading(false);
      return;
    }

    try {
      // Call the registration API
      const response = await fetch('/.netlify/functions/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante la registrazione');
      }

      // Registration successful
      setSuccess(true);
      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
        {/* Animated Background */}
        <AnimatedBackground />
        
        {/* Language Selector in top-right corner */}
        <div className="absolute top-4 right-4 z-10">
          <LanguageSelector />
        </div>
        
        <div className="max-w-md w-full space-y-4 relative z-20">
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                {t('auth.register.registrationSuccess')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                La tua richiesta è stata inviata. Attendi l&apos;approvazione dell&apos;amministratore.
              </p>
              <div className="mt-6">
                <Link
                  href="/it/login"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Vai al Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center pt-8 pb-4 px-4 sm:px-6 lg:px-8 relative">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Language Selector in top-right corner */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSelector />
      </div>
      
      <div className="max-w-md w-full space-y-4 relative z-10">
        {/* Login Logo Display */}
        <LoginLogoDisplay />
        
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {t('auth.register.title')}
          </h2>
          {!companyLoading && (
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('auth.register.subtitle', { companyName })}
            </p>
          )}
        </div>
        
        <form className="space-y-6 bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                {t('auth.register.name')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={t('auth.register.name')}
                value={formData.name}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                {t('auth.register.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={t('auth.register.email')}
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {t('auth.register.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={t('auth.register.password')}
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                {t('auth.register.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder={t('auth.register.confirmPassword')}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('common.loading')}...
                </>
              ) : (
                t('auth.register.submit')
              )}
            </button>
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-600">
              {t('auth.register.hasAccount')}{' '}
              <Link
                href="/it/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                {t('auth.register.login')}
              </Link>
            </span>
          </div>

          {!companyLoading && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Registrandoti accetti che i tuoi dati vengano utilizzati per la gestione delle ferie aziendali in conformità alla privacy policy di {companyName}.
                <br />
                Solo email aziendali {companyName} sono accettate.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}