'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface LogoSettings {
  logo_type: 'image' | 'text';
  logo_url: string | null;
  brand_text: string;
  login_logo_type: 'image' | 'text';
  login_logo_url: string | null;
  login_brand_text: string;
}

interface LogoContextType {
  logoSettings: LogoSettings;
  loading: boolean;
  error: string | null;
  refreshLogoSettings: () => Promise<void>;
}

const LogoContext = createContext<LogoContextType | undefined>(undefined);

const DEFAULT_SETTINGS: LogoSettings = {
  logo_type: 'image',
  logo_url: '/images/ OMNIA HOLIDAY TRACKER Logo 2.png',
  brand_text: 'Omnia Holiday Tracker',
  login_logo_type: 'image', 
  login_logo_url: '/images/ OMNIA HOLIDAY TRACKER Logo 2.png',
  login_brand_text: 'Omnia Holiday Tracker'
};

export function LogoProvider({ children }: { children: ReactNode }) {
  const [logoSettings, setLogoSettings] = useState<LogoSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogoSettings = useCallback(async () => {
    try {
      setError(null);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/.netlify/functions/get-logo-settings', {
        method: 'GET',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setLogoSettings(result.data);
          // Remove excessive logging - only log once when settings change
          // console.log('✅ Logo settings loaded globally');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.warn('⚠️ Using default logo settings due to error:', errorMessage);
      setLogoSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshLogoSettings = useCallback(async () => {
    setLoading(true);
    await fetchLogoSettings();
  }, [fetchLogoSettings]);

  // Initial load
  useEffect(() => {
    fetchLogoSettings();
  }, [fetchLogoSettings]);

  // Only refresh on window focus if we had an error before
  useEffect(() => {
    const handleFocus = () => {
      if (error) {
        fetchLogoSettings();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [error, fetchLogoSettings]);

  const contextValue: LogoContextType = {
    logoSettings,
    loading,
    error,
    refreshLogoSettings
  };

  return (
    <LogoContext.Provider value={contextValue}>
      {children}
    </LogoContext.Provider>
  );
}

export function useLogoSettings(): LogoContextType {
  const context = useContext(LogoContext);
  if (context === undefined) {
    throw new Error('useLogoSettings must be used within a LogoProvider');
  }
  return context;
}