'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface LogoSettings {
  logo_type: 'image' | 'text';
  logo_url: string | null;
  brand_text: string;
}

interface CustomizableHeaderProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CustomizableHeader({ children, className = "", style }: CustomizableHeaderProps) {
  const [logoSettings, setLogoSettings] = useState<LogoSettings>({
    logo_type: 'image',
    logo_url: '/images/ OMNIA HOLIDAY TRACKER Logo 2.png', // default logo
    brand_text: 'Omnia Holiday Tracker'
  });
  
  const [loading, setLoading] = useState(true);

  // Fetch logo settings on component mount and when page focus returns
  useEffect(() => {
    fetchLogoSettings();
    
    // Ricarica le impostazioni quando la finestra torna in focus
    // (utile dopo il reload automatico del salvataggio)
    const handleFocus = () => {
      fetchLogoSettings();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchLogoSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Prova sempre a fare la richiesta (anche senza token per il debug)
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
          console.log('Logo settings loaded:', result.data);
          setLogoSettings(result.data);
        }
      } else {
        console.log('Failed to fetch logo settings, status:', response.status);
      }
    } catch (error) {
      console.log('Could not fetch logo settings, using defaults:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderLogo = () => {
    if (loading) {
      // Loading skeleton
      return (
        <div className="animate-pulse bg-gray-200 h-28 w-64 rounded"></div>
      );
    }

    console.log('Rendering logo with settings:', logoSettings);

    // Controllo per modalità immagine con URL valido
    if (logoSettings.logo_type === 'image' && logoSettings.logo_url && logoSettings.logo_url.trim() !== '') {
      return (
        <Image
          src={logoSettings.logo_url}
          alt="Company Logo"
          width={687}
          height={165}
          className="w-auto"
          style={{ height: '110px' }}
          priority
        />
      );
    } 
    
    // Controllo per modalità testo con testo valido
    if (logoSettings.logo_type === 'text' && logoSettings.brand_text && logoSettings.brand_text.trim() !== '') {
      return (
        <div className="text-3xl font-bold text-gray-900" style={{ lineHeight: '110px' }}>
          {logoSettings.brand_text}
        </div>
      );
    }
    
    // Fallback al logo di default
    return (
      <Image
        src="/images/ OMNIA HOLIDAY TRACKER Logo 2.png"
        alt="Omnia Holiday Tracker"
        width={687}
        height={165}
        className="w-auto"
        style={{ height: '110px' }}
        priority
      />
    );
  };

  return (
    <div className={`sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="px-4 lg:px-8" style={{ minHeight: '92px', paddingTop: '1px', paddingBottom: '1px', ...style }}>
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center">
            {renderLogo()}
          </div>
          {children && (
            <div className="flex items-center space-x-4">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}