'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

interface LoginLogoSettings {
  login_logo_type: 'image' | 'text';
  login_logo_url: string | null;
  login_brand_text: string;
}

interface LoginLogoDisplayProps {
  className?: string;
}

export function LoginLogoDisplay({ className = "" }: LoginLogoDisplayProps) {
  const [logoSettings, setLogoSettings] = useState<LoginLogoSettings>({
    login_logo_type: 'text',
    login_logo_url: null,
    login_brand_text: 'Omnia Holiday Tracker'
  });
  
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted (avoid hydration mismatch)
  useEffect(() => {
    setMounted(true);
    fetchLoginLogoSettings();
  }, []);

  const fetchLoginLogoSettings = async () => {
    try {
      // Fetch logo settings without authentication (public page)
      const response = await fetch('/.netlify/functions/get-logo-settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('Login logo settings loaded:', result.data);
          setLogoSettings({
            login_logo_type: result.data.login_logo_type || 'text',
            login_logo_url: result.data.login_logo_url || null,
            login_brand_text: result.data.login_brand_text || 'Omnia Holiday Tracker'
          });
        }
      } else {
        console.log('Failed to fetch login logo settings, using defaults');
      }
    } catch (error) {
      console.log('Could not fetch login logo settings, using defaults:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderLoginLogo = () => {
    // Show loading placeholder during initial fetch - no text to avoid flash
    if (!mounted || loading) {
      return (
        <div className="text-center">
          <div className="h-32 flex items-center justify-center">
            {/* Loading spinner or empty space to prevent text flash */}
            <div className="animate-pulse bg-gray-200 rounded-lg h-16 w-48"></div>
          </div>
        </div>
      );
    }

    console.log('Rendering login logo with settings:', logoSettings);

    // Check for image mode with valid URL
    if (logoSettings.login_logo_type === 'image' && logoSettings.login_logo_url && logoSettings.login_logo_url.trim() !== '') {
      return (
        <div className="flex justify-center">
          <Image
            src={logoSettings.login_logo_url}
            alt="Company Logo"
            width={900}
            height={450}
            className="max-h-72 w-auto object-contain"
            priority
          />
        </div>
      );
    } 
    
    // Check for text mode with valid text
    if (logoSettings.login_logo_type === 'text' && logoSettings.login_brand_text && logoSettings.login_brand_text.trim() !== '') {
      return (
        <div className="text-center">
          <div className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            {logoSettings.login_brand_text}
          </div>
        </div>
      );
    }
    
    // Fallback to default text
    return (
      <div className="text-center">
        <div className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          Omnia Holiday Tracker
        </div>
      </div>
    );
  };

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex justify-center">
        {renderLoginLogo()}
      </div>
    </div>
  );
}