/**
 * Admin Dashboard Hash Routing Utilities
 * Shared between admin dashboard and language switcher
 */

export type AdminTabType = 'overview' | 'calendar' | 'employees' | 'requests' | 'documents' | 'my-requests' | 'departments' | 'reports' | 'settings';

// Hash to tab mapping for URL routing (supports all languages)
export const hashToTab: Record<string, AdminTabType> = {
  // Italian
  '#panoramica': 'overview',
  '#calendario': 'calendar',
  '#dipendenti': 'employees',
  '#richieste': 'requests',
  '#documenti': 'documents',
  '#le-mie-richieste': 'my-requests',
  '#dipartimenti': 'departments',
  '#report': 'reports',
  '#impostazioni': 'settings',
  // English
  '#overview': 'overview',
  '#calendar': 'calendar',
  '#employees': 'employees',
  '#requests': 'requests',
  '#documents': 'documents',
  '#my-requests': 'my-requests',
  '#departments': 'departments',
  '#reports': 'reports',
  '#settings': 'settings',
  // Spanish
  '#resumen': 'overview',
  '#empleados': 'employees',
  '#solicitudes': 'requests',
  '#documentos': 'documents',
  '#mis-solicitudes': 'my-requests',
  '#departamentos': 'departments',
  '#informes': 'reports',
  '#configuracion': 'settings'
};

// Tab to hash mapping for URL updates (using current locale)
export const getTabHash = (tab: AdminTabType, locale: string = 'it'): string => {
  const hashes = {
    it: {
      overview: '#panoramica',
      calendar: '#calendario',
      employees: '#dipendenti',
      requests: '#richieste',
      documents: '#documenti',
      'my-requests': '#le-mie-richieste',
      departments: '#dipartimenti',
      reports: '#report',
      settings: '#impostazioni'
    },
    en: {
      overview: '#overview',
      calendar: '#calendar',
      employees: '#employees',
      requests: '#requests',
      documents: '#documents',
      'my-requests': '#my-requests',
      departments: '#departments',
      reports: '#reports',
      settings: '#settings'
    },
    es: {
      overview: '#resumen',
      calendar: '#calendario',
      employees: '#empleados',
      requests: '#solicitudes',
      documents: '#documentos',
      'my-requests': '#mis-solicitudes',
      departments: '#departamentos',
      reports: '#informes',
      settings: '#configuracion'
    }
  };

  return hashes[locale as keyof typeof hashes]?.[tab] || hashes.it[tab] || '#panoramica';
};

/**
 * Convert hash from one language to another
 * @param currentHash Current hash (e.g. '#my-requests')
 * @param targetLocale Target language locale (e.g. 'it')
 * @returns Translated hash (e.g. '#le-mie-richieste')
 */
export const translateHash = (currentHash: string, targetLocale: string): string => {
  // Find the tab type from current hash
  const tabType = hashToTab[currentHash];

  if (!tabType) {
    console.log(`⚠️ Unknown hash: ${currentHash}, defaulting to overview`);
    return getTabHash('overview', targetLocale);
  }

  // Convert to target language hash
  const translatedHash = getTabHash(tabType, targetLocale);
  console.log(`🔄 Hash translation: ${currentHash} → ${translatedHash} (${targetLocale})`);

  return translatedHash;
};

/**
 * Check if current path is admin dashboard
 * @param pathname Current pathname
 * @returns True if admin dashboard
 */
export const isAdminDashboard = (pathname: string): boolean => {
  return pathname.includes('/admin-dashboard');
};