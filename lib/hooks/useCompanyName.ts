'use client';

import { useState, useEffect } from 'react';

export function useCompanyName() {
  const [companyName, setCompanyName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        const response = await fetch('/.netlify/functions/get-public-settings');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.settings && result.settings['company.name']) {
            setCompanyName(result.settings['company.name']);
          } else {
            // Set fallback only after API call completes
            setCompanyName('OmniaGroup');
          }
        } else {
          // Set fallback if API fails
          setCompanyName('OmniaGroup');
        }
      } catch (error) {
        console.log('Could not fetch company name, using default:', error);
        // Set fallback if request fails
        setCompanyName('OmniaGroup');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyName();
  }, []);

  return { companyName, loading };
}