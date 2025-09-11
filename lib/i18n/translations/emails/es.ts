/**
 * Traducciones de email en Español
 * Para sistema de notificaciones OMNIA HOLIDAY TRACKER
 */

export const emailTranslations = {
  subjects: {
    employee_registration: '🆕 Nuevo Empleado Registrado - {name}',
    holiday_request_submitted: '📝 Nueva Solicitud de Vacaciones de {name}',
    holiday_request_approved: '✅ Solicitud de Vacaciones Aprobada',
    holiday_request_rejected: '❌ Solicitud de Vacaciones Rechazada',
    employee_approved: '👋 ¡Bienvenido a OMNIA HOLIDAY TRACKER!',
    holiday_starting_reminder: '🏖️ Recordatorio: Tus Vacaciones Comienzan Mañana'
  },

  templates: {
    employee_registration: {
      title: 'Nuevo Empleado Registrado',
      greeting: 'Un nuevo empleado se ha registrado en el sistema de vacaciones:',
      fields: {
        name: 'Nombre',
        email: 'Email', 
        department: 'Departamento',
        jobTitle: 'Puesto',
        phone: 'Teléfono',
        holidayAllowance: 'Días de Vacaciones Anuales',
        registrationDate: 'Fecha de Registro',
        status: 'Estado'
      },
      values: {
        notAssigned: 'No asignado',
        notSpecified: 'No especificado',
        notProvided: 'No proporcionado',
        pendingApproval: 'Esperando aprobación'
      },
      message: 'Accede al panel de administración para aprobar al empleado y activar su cuenta.',
      buttonText: 'Aprobar Empleado'
    },

    holiday_request_submitted: {
      title: 'Nueva Solicitud de Vacaciones',
      greeting: 'Se ha enviado una nueva solicitud de vacaciones que requiere tu aprobación:',
      fields: {
        employee: 'Empleado',
        period: 'Período',
        days: 'Días Solicitados',
        type: 'Tipo',
        notes: 'Notas',
        status: 'Estado'
      },
      types: {
        vacation: 'Vacaciones',
        sick: 'Enfermedad',
        personal: 'Personal'
      },
      message: 'Revisa la solicitud y toma una decisión de aprobación.',
      buttonText: 'Gestionar Solicitudes'
    },

    holiday_request_approved: {
      title: 'Solicitud de Vacaciones Aprobada',
      greeting: '¡Buenas noticias! Tu solicitud de vacaciones ha sido aprobada:',
      fields: {
        period: 'Período',
        days: 'Días Solicitados',
        type: 'Tipo',
        approvedBy: 'Aprobado Por',
        approvedOn: 'Fecha de Aprobación'
      },
      message: 'Tu solicitud de vacaciones ha sido aprobada. ¡Que disfrutes tus vacaciones!',
      buttonText: 'Ver Dashboard'
    },

    holiday_request_rejected: {
      title: 'Solicitud de Vacaciones Rechazada',
      greeting: 'Lamentablemente, tu solicitud de vacaciones no ha sido aprobada.',
      fields: {
        period: 'Período',
        days: 'Días Solicitados',
        rejectedBy: 'Rechazado Por',
        reason: 'Motivo'
      },
      values: {
        noReasonSpecified: 'No especificado'
      },
      message: 'Puedes enviar una nueva solicitud para fechas diferentes o contactar a tu manager para más aclaraciones.',
      buttonText: 'Nueva Solicitud'
    },

    employee_approved: {
      title: '¡Bienvenido a OMNIA HOLIDAY TRACKER!',
      greeting: 'Tu cuenta ha sido aprobada y activada.',
      fields: {
        name: 'Nombre',
        email: 'Email',
        department: 'Departamento',
        jobTitle: 'Puesto',
        holidayAllowance: 'Días de Vacaciones Anuales',
        approvedBy: 'Aprobado Por'
      },
      message: 'Ahora puedes acceder al sistema y comenzar a gestionar tus solicitudes de vacaciones.',
      buttonText: 'Acceder al Sistema'
    }
  },

  common: {
    footer: {
      copyright: '© 2025 OmniaServices. Todos los derechos reservados.',
      automated: 'Notificación automática de OMNIA HOLIDAY TRACKER.'
    },
    buttons: {
      viewDashboard: 'Ver Dashboard',
      manageRequests: 'Gestionar Solicitudes',
      newRequest: 'Nueva Solicitud',
      loginSystem: 'Acceder al Sistema'
    }
  }
};

export default emailTranslations;