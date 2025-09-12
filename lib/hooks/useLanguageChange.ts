'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook per gestire il cambio lingua in modo pulito
 * Previene errori di fetch durante il re-rendering causato dal cambio lingua
 */
export function useLanguageChange() {
  const isLanguageChanging = useRef(false);
  const languageChangeTimer = useRef<NodeJS.Timeout | null>(null);

  // Funzione per marcare che è in corso un cambio lingua
  const markLanguageChanging = useCallback(() => {
    isLanguageChanging.current = true;
    
    // Clear existing timer
    if (languageChangeTimer.current) {
      clearTimeout(languageChangeTimer.current);
    }
    
    // Reset flag after 2 seconds
    languageChangeTimer.current = setTimeout(() => {
      isLanguageChanging.current = false;
    }, 2000);
  }, []);

  // Verifica se è in corso un cambio lingua
  const getIsLanguageChanging = useCallback(() => {
    return isLanguageChanging.current;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (languageChangeTimer.current) {
        clearTimeout(languageChangeTimer.current);
      }
    };
  }, []);

  return {
    markLanguageChanging,
    getIsLanguageChanging,
  };
}

/**
 * Wrapper per fetch che ignora errori durante cambio lingua
 */
export function createLanguageAwareFetch() {
  const { getIsLanguageChanging } = useLanguageChange();

  return useCallback(
    async (url: string, options?: RequestInit): Promise<Response> => {
      try {
        const response = await fetch(url, {
          ...options,
          // Add timeout to prevent hanging requests during language changes
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
        return response;
      } catch (error) {
        // During language changes, ignore fetch errors
        if (getIsLanguageChanging() && error instanceof Error) {
          if (error.message.includes('Load failed') || 
              error.message.includes('aborted') ||
              error.message.includes('timeout')) {
            // Return a mock successful response to prevent console spam
            return new Response(JSON.stringify({ success: false, silent: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
        throw error;
      }
    },
    [getIsLanguageChanging]
  );
}