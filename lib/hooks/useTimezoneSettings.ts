'use client';

import { useState, useEffect } from 'react';

interface TimezoneSettings {
  timezone: string;
  showFullTimezone: boolean;
  showTimezoneIndicator: boolean;
}

export function useTimezoneSettings() {
  const [settings, setSettings] = useState<TimezoneSettings>({
    timezone: 'auto',
    showFullTimezone: false,
    showTimezoneIndicator: true,
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Carica le impostazioni dal localStorage
    const loadSettings = () => {
      try {
        const savedTimezone = localStorage.getItem('timezone-setting') || 'auto';
        const savedShowFull = localStorage.getItem('timezone-show-full') === 'true';
        const savedShowIndicator = localStorage.getItem('timezone-show-indicator') !== 'false'; // default true

        setSettings({
          timezone: savedTimezone,
          showFullTimezone: savedShowFull,
          showTimezoneIndicator: savedShowIndicator,
        });
      } catch (error) {
        console.warn('Errore nel caricamento delle impostazioni timezone:', error);
        // Usa i valori di default in caso di errore
      } finally {
        setIsLoaded(true);
      }
    };

    // Carica immediatamente
    loadSettings();

    // Ascolta i cambiamenti del localStorage (per aggiornamenti real-time)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('timezone-')) {
        loadSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Ascolta anche eventi custom per aggiornamenti nella stessa tab
    const handleCustomUpdate = () => {
      loadSettings();
    };

    window.addEventListener('timezone-settings-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('timezone-settings-updated', handleCustomUpdate);
    };
  }, []);

  // Funzione per salvare le impostazioni
  const saveSettings = (newSettings: Partial<TimezoneSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };

      if (newSettings.timezone !== undefined) {
        localStorage.setItem('timezone-setting', newSettings.timezone);
      }
      if (newSettings.showFullTimezone !== undefined) {
        localStorage.setItem('timezone-show-full', newSettings.showFullTimezone.toString());
      }
      if (newSettings.showTimezoneIndicator !== undefined) {
        localStorage.setItem('timezone-show-indicator', newSettings.showTimezoneIndicator.toString());
      }

      setSettings(updatedSettings);

      // Emetti un evento custom per notificare altri componenti
      window.dispatchEvent(new CustomEvent('timezone-settings-updated'));

      return true;
    } catch (error) {
      console.error('Errore nel salvataggio delle impostazioni timezone:', error);
      return false;
    }
  };

  return {
    settings,
    isLoaded,
    saveSettings,
  };
}

// Hook semplificato per ottenere solo le props del LiveClock
export function useTimezoneClockProps() {
  const { settings, isLoaded } = useTimezoneSettings();

  if (!isLoaded) {
    // Ritorna i valori di default durante il caricamento
    return {
      manualTimezone: undefined,
      showFullTimezone: false,
      showTimezoneIndicator: true,
      isLoaded: false,
    };
  }

  return {
    manualTimezone: settings.timezone === 'auto' ? undefined : settings.timezone,
    showFullTimezone: settings.showFullTimezone,
    showTimezoneIndicator: settings.showTimezoneIndicator,
    isLoaded: true,
  };
}