'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavigationGuardProps {
  children: React.ReactNode;
}

export function NavigationGuard({ children }: NavigationGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Override router.push to handle RSC issues
    const originalPush = router.push;
    
    router.push = function(href: string, options?: any) {
      try {
        setIsNavigating(true);
        // Use replace instead of push to avoid RSC cache issues in development
        if (process.env.NODE_ENV === 'development') {
          return router.replace(href, options);
        }
        return originalPush.call(this, href, options);
      } catch (error) {
        console.warn('Navigation error, falling back to window.location:', error);
        window.location.href = href;
        return Promise.resolve();
      } finally {
        setTimeout(() => setIsNavigating(false), 100);
      }
    };

    return () => {
      router.push = originalPush;
    };
  }, [router]);

  // Reset navigation state when pathname changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  return (
    <div className={isNavigating ? 'nav-loading' : ''}>
      {children}
    </div>
  );
}