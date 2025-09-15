const formsIt = {
  holidays: {
    request: {
      title: 'Nuova richiesta ferie',
      modalTitle: 'Richiesta Permesso',
      modalDescription: 'Compila il modulo per richiedere un nuovo periodo di ferie',
      startDate: 'Data inizio',
      endDate: 'Data fine',
      type: 'Tipo di assenza',
      types: {
        vacation: 'Ferie',
        sick: 'Malattia',
        personal: 'Permesso personale',
      },
      notes: 'Note (opzionali)',
      workingDays: 'Giorni lavorativi',
      submit: 'Invia richiesta',
      success: 'Richiesta inviata con successo',
      overlap: 'Le date si sovrappongono con un\'altra richiesta',
      insufficientDays: 'Giorni disponibili insufficienti',
      steps: {
        dates: 'Seleziona Date',
        dateDescription: 'Seleziona il periodo',
        type: 'Tipo Permesso',
        typeDescription: 'Tipo di permesso',
        notes: 'Note Aggiuntive',
        notesDescription: 'Aggiungi dettagli',
        review: {
          title: 'Riepilogo',
          description: 'Conferma e invia'
        }
      },
      stepTitles: {
        selectPeriod: 'Seleziona il Periodo',
        selectPeriodDescription: 'Scegli le date per la tua richiesta di permesso',
        leaveType: 'Tipo di Permesso',
        leaveTypeDescription: 'Seleziona il tipo di assenza che stai richiedendo',
        additionalNotes: 'Note Aggiuntive',
        additionalNotesDescription: 'Aggiungi eventuali dettagli o giustificazioni',
        summary: 'Riepilogo Richiesta',
        summaryDescription: 'Verifica i dettagli prima di inviare'
      },
      dateLabels: {
        startDate: 'Data Inizio',
        endDate: 'Data Fine',
        startDateHelper: 'Primo giorno di ferie (non si lavora)',
        endDateHelper: 'Ultimo giorno di ferie (si torna al lavoro il giorno dopo)',
        workingDaysRequested: 'Giorni lavorativi richiesti',
        days: 'giorni'
      },
      multiStep: {
        step: 'Passo',
        of: 'di',
        back: 'Indietro',
        next: 'Avanti',
        cancel: 'Annulla',
        submit: 'Invia Richiesta',
        selectDates: 'Seleziona il Periodo',
        selectDatesDesc: 'Scegli le date per la tua richiesta di permesso',
        selectType: 'Tipo di Permesso',
        selectTypeDesc: 'Seleziona il tipo di assenza che stai richiedendo',
        addNotes: 'Note Aggiuntive',
        addNotesDesc: 'Aggiungi eventuali dettagli o giustificazioni',
        reviewRequest: 'Riepilogo Richiesta',
        reviewRequestDesc: 'Verifica i dettagli prima di inviare',
        workingDaysRequested: 'Giorni lavorativi richiesti',
        holidayBalance: 'Saldo Ferie',
        total: 'Totali',
        used: 'Utilizzate',
        remaining: 'Rimanenti',
        afterRequest: 'Dopo questa richiesta:',
        daysRemaining: 'giorni rimanenti',
        conflictWarning: 'Le date selezionate si sovrappongono con una richiesta esistente',
        insufficientBalance: 'Non hai abbastanza giorni di ferie disponibili per questo periodo',
        checkingConflicts: 'Verifica conflitti con altre richieste...',
        employee: 'Dipendente',
        email: 'Email',
        startDate: 'Data Inizio',
        endDate: 'Data Fine',
        type: 'Tipo',
        workingDays: 'Giorni Lavorativi',
        finalWarning: 'Attenzione: questa richiesta supera i tuoi giorni di ferie disponibili',
        absenceType: 'Tipo di Assenza',
        vacationDescription: 'Ferie annuali - vengono scalate dal monte ore',
        sickDescription: 'Congedo per malattia - certificato medico obbligatorio',
        personalDescription: 'Permesso personale - per esigenze personali e familiari',
        characters: 'caratteri',
        medicalCertRequired: 'Certificato Medico Obbligatorio',
        medicalCertRequiredDesc: 'Il certificato medico è obbligatorio per i congedi per malattia. Puoi caricarlo subito o impegnarti a fornirlo successivamente.',
        medicalCertOptions: 'Modalità Certificato Medico',
        uploadNow: 'Carico il certificato medico ora',
        sendLater: 'Mi impegno a fornirlo successivamente via email alla direzione aziendale',
        uploadMedicalCert: 'Caricamento Certificato Medico',
        selectFile: 'Clicca per selezionare il file',
        dragFile: 'o trascinalo qui',
        dropFile: 'Rilascia il file qui',
        fileFormats: 'PDF, DOC, DOCX, JPG, PNG (MAX 5MB)',
        uploadDesc: 'Seleziona e carica il certificato medico in formato PDF, DOC, DOCX, o immagine (JPG/PNG)',
        commitmentConfirmed: 'Impegno Confermato',
        commitmentText: 'Ti impegni a fornire il certificato medico via email alla direzione aziendale entro 3 giorni lavorativi dalla presentazione di questa richiesta.',
        invalidFileFormat: 'Formato file non valido. Sono supportati solo PDF, DOC, DOCX, JPG e PNG.'
      }
    },
    pageContent: {
      backButton: 'Indietro',
      loadingText: 'Caricamento...',
      loadingData: 'Caricamento dati...',
      subtitle: 'Compila il modulo per richiedere giorni di ferie, malattia o permessi personali',
      statsCards: {
        availableDays: 'Giorni disponibili',
        pendingRequests: 'In attesa',
        approvedRequests: 'Approvate'
      },
      helpSection: {
        title: 'Informazioni Utili',
        leaveTypes: {
          title: 'Tipi di Assenza',
          vacation: 'Ferie: Vengono scalate dal monte ore annuale',
          sick: 'Malattia: Richiedono certificato medico',
          personal: 'Permesso Personale: Per esigenze familiari'
        },
        approvalProcess: {
          title: 'Processo di Approvazione',
          managerReview: 'Le richieste vengono inviate al manager',
          approvalTime: 'Tempi di approvazione: 1-3 giorni lavorativi',
          emailNotification: 'Riceverai una notifica via email'
        }
      }
    },
    profile: {
      editTitle: 'Modifica Profilo',
      nameLabel: 'Nome e Cognome',
      emailLabel: 'Email',
      phoneLabel: 'Telefono (opzionale)',
      departmentLabel: 'Dipartimento',
      roleInfo: 'Il ruolo può essere modificato solo dagli amministratori',
      confirmPasswordLabel: 'Conferma Password',
      confirmPasswordPlaceholder: 'Conferma nuova password',
      cancel: 'Annulla',
      save: 'Salva Modifiche',
      saving: 'Salvataggio...',
      validation: {
        nameMin: 'Nome deve avere almeno 2 caratteri',
        emailInvalid: 'Email non valida',
        phoneMin: 'Numero di telefono deve avere almeno 10 cifre',
        jobTitleMin: 'Mansione deve avere almeno 2 caratteri',
        jobTitleMax: 'Mansione non può superare 100 caratteri',
      },
      errors: {
        generic: 'Errore',
        unsupportedFormat: 'Formato file non supportato. Usa: JPEG, PNG, GIF o WebP',
        fileTooLarge: 'File troppo grande. Dimensione massima: 2MB',
        avatarUpload: 'Errore durante il caricamento dell\'avatar',
        avatarError: 'Errore Avatar',
        profileUpdate: 'Errore durante l\'aggiornamento',
        profileUpdateGeneric: 'Errore durante l\'aggiornamento del profilo',
      },
      success: {
        title: 'Successo',
        profileUpdated: 'Profilo aggiornato con successo',
      },
    },
  },
  holidayHistory: {
    title: 'Storico Richieste',
    filters: {
      status: 'Stato',
      allStatuses: 'Tutti gli stati',
      type: 'Tipo',
      allTypes: 'Tutti i tipi',
    },
    columns: {
      workingDays: 'Giorni lavorativi',
      days: 'Giorni',
    },
    statuses: {
      approved: 'Approvata',
      pending: 'In attesa',
      rejected: 'Rifiutata',
      cancelled: 'Annullata',
    },
    types: {
      vacation: 'Ferie',
      sick: 'Malattia',
      personal: 'Personale',
    },
    actions: {
      delete: 'Elimina',
    },
    messages: {
      noRequests: 'Nessuna richiesta trovata',
      cancelError: 'Errore nell\'annullamento della richiesta',
      downloadError: 'Errore nel download del certificato',
      deleteError: 'Errore nell\'eliminazione della richiesta',
      cancelNote: 'Annullata dal dipendente',
    },
  },
  roles: {
    admin: 'Amministratore',
    employee: 'Dipendente',
  },
  statusBadge: {
    pending: 'In Attesa',
    active: 'Attivo',
    inactive: 'Inattivo',
  },
  validation: {
    startDateRequired: 'Data di inizio richiesta',
    endDateRequired: 'Data di fine richiesta',
    typeRequired: 'Seleziona il tipo di permesso',
    notesOptional: 'Note aggiuntive (opzionale)',
    selectStartDate: 'Seleziona data di inizio',
    selectEndDate: 'Seleziona data di fine',
    selectLeaveType: 'Seleziona il tipo di assenza',
    endDateAfterStart: 'La data di fine deve essere uguale o successiva alla data di inizio',
    noPastDates: 'Non è possibile richiedere permessi per date passate',
    noFutureDates: 'Non è possibile richiedere permessi oltre un anno in anticipo',
    medicalCertRequired: 'Il certificato medico è obbligatorio per i congedi per malattia',
  },
  multiStepForm: {
    steps: {
      date: {
        title: 'Date',
        description: 'Seleziona il periodo',
      },
      type: {
        title: 'Tipo',
        description: 'Tipo di permesso',
      },
      notes: {
        title: 'Note', 
        description: 'Aggiungi dettagli',
      },
      summary: {
        title: 'Riepilogo',
        description: 'Conferma e invia',
      },
      review: {
        title: 'Riepilogo',
        description: 'Conferma e invia',
      },
      dates: {
        title: 'Date',
        description: 'Seleziona date',
      },
    },
  },
} as const;

export default formsIt;