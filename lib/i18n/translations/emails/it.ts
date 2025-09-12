/**
 * Traduzioni email in Italiano
 * Per sistema notifiche OMNIA HOLIDAY TRACKER
 */

export const emailTranslations = {
  subjects: {
    employee_registration: '🆕 Nuovo dipendente registrato - {name}',
    holiday_request_submitted: '📝 Nuova richiesta ferie da {name}',
    holiday_request_approved: '✅ Richiesta ferie approvata',
    holiday_request_rejected: '❌ Richiesta ferie rifiutata',
    employee_approved: '👋 Benvenuto in OMNIA HOLIDAY TRACKER!',
    holiday_starting_reminder: '🏖️ Promemoria: {name} inizia le ferie domani'
  },

  templates: {
    employee_registration: {
      title: 'Nuovo Dipendente Registrato',
      greeting: 'Un nuovo dipendente si è registrato al sistema ferie:',
      fields: {
        name: 'Nome',
        email: 'Email', 
        department: 'Dipartimento',
        jobTitle: 'Ruolo',
        phone: 'Telefono',
        holidayAllowance: 'Giorni ferie annuali',
        registrationDate: 'Data registrazione',
        status: 'Stato'
      },
      values: {
        notAssigned: 'Non assegnato',
        notSpecified: 'Non specificato',
        notProvided: 'Non fornito',
        pendingApproval: 'In attesa di approvazione'
      },
      message: 'Accedi al pannello admin per approvare il dipendente e attivare il suo account.',
      buttonText: 'Approva Dipendente'
    },

    holiday_request_submitted: {
      title: 'Nuova Richiesta Ferie',
      greeting: 'È stata inviata una nuova richiesta ferie che richiede la tua approvazione:',
      fields: {
        employee: 'Dipendente',
        period: 'Periodo',
        days: 'Giorni richiesti',
        type: 'Tipo',
        notes: 'Note',
        status: 'Stato'
      },
      types: {
        vacation: 'Ferie',
        sick: 'Malattia',
        personal: 'Personali'
      },
      message: 'Rivedi la richiesta e prendi una decisione di approvazione.',
      buttonText: 'Gestisci Richieste'
    },

    holiday_request_approved: {
      title: 'Richiesta Ferie Approvata',
      greeting: 'Buone notizie! La tua richiesta ferie è stata approvata:',
      fields: {
        period: 'Periodo',
        days: 'Giorni richiesti',
        type: 'Tipo',
        approvedBy: 'Approvata da',
        approvedOn: 'Data approvazione'
      },
      message: 'La tua richiesta ferie è stata approvata. Buone vacanze!',
      buttonText: 'Visualizza Dashboard'
    },

    holiday_request_rejected: {
      title: 'Richiesta Ferie Rifiutata',
      greeting: 'Purtroppo la tua richiesta ferie non è stata approvata.',
      fields: {
        period: 'Periodo',
        days: 'Giorni richiesti',
        rejectedBy: 'Rifiutata da',
        reason: 'Motivo'
      },
      values: {
        noReasonSpecified: 'Non specificato'
      },
      message: 'Puoi presentare una nuova richiesta per date diverse o contattare il tuo manager per ulteriori chiarimenti.',
      buttonText: 'Nuova Richiesta'
    },

    employee_approved: {
      title: 'Benvenuto in OMNIA HOLIDAY TRACKER!',
      greeting: 'Il tuo account è stato approvato e attivato.',
      fields: {
        name: 'Nome',
        email: 'Email',
        department: 'Dipartimento',
        jobTitle: 'Ruolo',
        holidayAllowance: 'Giorni ferie annuali',
        approvedBy: 'Approvato da'
      },
      message: 'Ora puoi accedere al sistema e iniziare a gestire le tue richieste ferie.',
      buttonText: 'Accedi al Sistema'
    },

    holiday_starting_reminder: {
      title: 'Promemoria Ferie',
      greeting: 'Un dipendente inizia le ferie a breve.',
      fields: {
        employee: 'Dipendente',
        startDate: 'Data inizio',
        endDate: 'Data fine',
        type: 'Tipo ferie',
        days: 'Giorni'
      },
      message: 'Assicurati che tutto sia organizzato per coprire le sue responsabilità durante l\'assenza.',
      buttonText: 'Visualizza Dashboard'
    }
  },

  common: {
    footer: {
      copyright: '© 2025 OmniaServices. Tutti i diritti riservati.',
      automated: 'Notifica automatica da OMNIA HOLIDAY TRACKER.'
    },
    buttons: {
      viewDashboard: 'Visualizza Dashboard',
      manageRequests: 'Gestisci Richieste',
      newRequest: 'Nuova Richiesta',
      loginSystem: 'Accedi al Sistema'
    }
  }
};

export default emailTranslations;