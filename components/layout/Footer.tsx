'use client';

import { useState, useEffect } from 'react';

export function Footer() {
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    // Load version from package.json
    const loadVersion = async () => {
      try {
        const response = await fetch('/api/version');
        if (response.ok) {
          const data = await response.json();
          setVersion(data.version);
        }
      } catch (error) {
        console.warn('Could not load version:', error);
      }
    };

    loadVersion();
  }, []);

  return (
    <footer className="mt-auto py-4 px-6 border-t border-gray-200 bg-gray-50">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          © {new Date().getFullYear()} OmniaGroup. All rights reserved.
        </div>
        {version && (
          <div className="text-xs text-gray-500">
            Version {version}
          </div>
        )}
      </div>
    </footer>
  );
}