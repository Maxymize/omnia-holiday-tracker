'use client';

import { useState } from 'react';

export function CookieDebug() {
  const [cookieInfo, setCookieInfo] = useState<any>(null);

  const debugCookies = () => {
    // Check document.cookie
    const documentCookies = document.cookie;
    
    // Parse cookies
    const parsedCookies = documentCookies.split(';').reduce((acc: any, cookie: string) => {
      const [name, value] = cookie.trim().split('=');
      acc[name] = value;
      return acc;
    }, {});

    // Check localStorage and sessionStorage
    const localStorageAuth = localStorage.getItem('auth-token');
    const sessionStorageAuth = sessionStorage.getItem('auth-token');

    const info = {
      documentCookie: documentCookies || 'empty',
      parsedCookies: parsedCookies,
      hasAuthToken: !!parsedCookies['auth-token'],
      hasRefreshToken: !!parsedCookies['refresh-token'],
      localStorageAuth: localStorageAuth || 'none',
      sessionStorageAuth: sessionStorageAuth || 'none',
      userAgent: navigator.userAgent,
      currentUrl: window.location.href,
      domain: window.location.hostname,
      protocol: window.location.protocol
    };

    console.log('🍪 Cookie Debug Info:', info);
    setCookieInfo(info);
  };

  const testDirectAuth = async () => {
    try {
      const response = await fetch('/api/debug-auth', {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      console.log('🔍 Direct auth test:', result);
      
      setCookieInfo((prev: any) => ({
        ...prev,
        directAuthTest: {
          status: response.status,
          data: result
        }
      }));
    } catch (error) {
      console.error('❌ Direct auth test failed:', error);
      setCookieInfo((prev: any) => ({
        ...prev,
        directAuthTest: {
          error: error.message
        }
      }));
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h3 className="font-bold text-yellow-800 mb-2">🍪 Cookie Debug</h3>
      <div className="flex gap-2 mb-3">
        <button
          onClick={debugCookies}
          className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
        >
          Debug Cookies
        </button>
        <button
          onClick={testDirectAuth}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
        >
          Test Direct Auth
        </button>
      </div>
      
      {cookieInfo && (
        <div className="bg-white p-3 rounded border">
          <pre className="text-xs overflow-auto max-h-40">
            {JSON.stringify(cookieInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}