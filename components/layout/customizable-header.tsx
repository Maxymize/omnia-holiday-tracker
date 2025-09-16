'use client';

import Image from 'next/image';
import { useLogoSettings } from '@/lib/contexts/LogoContext';
import { LiveClock } from '@/components/ui/live-clock';
import { useTimezoneClockProps } from '@/lib/hooks/useTimezoneSettings';

interface CustomizableHeaderProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CustomizableHeader({ children, className = "", style }: CustomizableHeaderProps) {
  const { logoSettings, loading } = useLogoSettings();
  const timezoneProps = useTimezoneClockProps();

  const renderLogo = () => {
    if (loading) {
      // Loading skeleton
      return (
        <div className="animate-pulse bg-gray-200 h-28 w-64 rounded"></div>
      );
    }

    // Removed excessive console logging - only log when needed for debugging

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
          <div className="flex items-center space-x-4">
            {/* Live Clock */}
            <div className="hidden lg:flex">
              <LiveClock
                compact
                showSeconds={false}
                showTimezone={true}
                {...timezoneProps}
              />
            </div>

            {/* Additional children (language switcher, etc.) */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}