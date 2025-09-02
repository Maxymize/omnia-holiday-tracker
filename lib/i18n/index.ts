import { Locale } from './config';

// Common section modular imports
import commonIt from './translations/common/it';
import commonEn from './translations/common/en';
import commonEs from './translations/common/es';

// Auth section modular imports
import authIt from './translations/auth/it';
import authEn from './translations/auth/en';
import authEs from './translations/auth/es';

// Dashboard section modular imports
import dashboardIt from './translations/dashboard/it';
import dashboardEn from './translations/dashboard/en';
import dashboardEs from './translations/dashboard/es';

// Admin section modular imports
import { adminIt } from './translations/admin/it';
import { adminEn } from './translations/admin/en';
import { adminEs } from './translations/admin/es';

// Forms section modular imports
import formsIt from './translations/forms/it';
import formsEn from './translations/forms/en';
import formsEs from './translations/forms/es';

export const translations = {
  it: {
    common: commonIt,
    notifications: {
      types: {
        holiday_request: 'Richieste',
        employee_registration: 'Registrazione',
        holiday_approved: 'Approvate', 
        holiday_rejected: 'Rifiutate',
        default: 'Attività',
      },
      actions: {
        openNotifications: 'Apri notifiche',
        closeNotification: 'Chiudi notifica',
        deleteNotification: 'Elimina notifica',
      },
    },
    auth: authIt,
    dashboard: dashboardIt,
    admin: adminIt,
    forms: formsIt,
  },
  en: {
    common: commonEn,
    notifications: {
      types: {
        holiday_request: 'Requests',
        employee_registration: 'Registration',
        holiday_approved: 'Approved', 
        holiday_rejected: 'Rejected',
        default: 'Activities',
      },
      actions: {
        openNotifications: 'Open notifications',
        closeNotification: 'Close notification',
        deleteNotification: 'Delete notification',
      },
    },
    auth: authEn,
    dashboard: dashboardEn,
    admin: adminEn,
    forms: formsEn,
  },
  es: {
    common: commonEs,
    notifications: {
      types: {
        holiday_request: 'Solicitudes',
        employee_registration: 'Registro',
        holiday_approved: 'Aprobadas', 
        holiday_rejected: 'Rechazadas',
        default: 'Actividades',
      },
      actions: {
        openNotifications: 'Abrir notificaciones',
        closeNotification: 'Cerrar notificación',
        deleteNotification: 'Eliminar notificación',
      },
    },
    auth: authEs,
    dashboard: dashboardEs,
    admin: adminEs,
    forms: formsEs,
  },
} as const;

export type TranslationKey = keyof typeof translations.it;