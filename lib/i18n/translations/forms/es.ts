const formsEs = {
  holidays: {
    request: {
      title: 'Nueva solicitud de vacaciones',
      modalTitle: 'Solicitud de Vacaciones',
      modalDescription: 'Completa el formulario para solicitar un nuevo período de vacaciones',
      startDate: 'Fecha de inicio',
      endDate: 'Fecha de fin',
      type: 'Tipo de ausencia',
      types: {
        vacation: 'Vacaciones',
        sick: 'Baja médica',
        personal: 'Día personal',
      },
      notes: 'Notas (opcional)',
      workingDays: 'Días laborables',
      submit: 'Enviar solicitud',
      success: 'Solicitud enviada con éxito',
      overlap: 'Las fechas se superponen con otra solicitud',
      insufficientDays: 'Días disponibles insuficientes',
      steps: {
        dates: 'Seleccionar Fechas',
        dateDescription: 'Selecciona el período',
        type: 'Tipo de Permiso',
        typeDescription: 'Tipo de ausencia',
        notes: 'Notas Adicionales',
        notesDescription: 'Añadir detalles',
        review: {
          title: 'Resumen',
          description: 'Confirmar y enviar'
        }
      },
      stepTitles: {
        selectPeriod: 'Seleccionar Período',
        selectPeriodDescription: 'Elige las fechas para tu solicitud de permiso',
        leaveType: 'Tipo de Permiso',
        leaveTypeDescription: 'Selecciona el tipo de ausencia que estás solicitando',
        additionalNotes: 'Notas Adicionales',
        additionalNotesDescription: 'Añade cualquier detalle o justificación',
        summary: 'Resumen de la Solicitud',
        summaryDescription: 'Revisa los detalles antes de enviar'
      },
      dateLabels: {
        startDate: 'Fecha de Inicio',
        endDate: 'Fecha de Fin',
        startDateHelper: 'Primer día de vacaciones (no se trabaja)',
        endDateHelper: 'Último día de vacaciones (se regresa al trabajo al día siguiente)',
        workingDaysRequested: 'Días laborables solicitados',
        days: 'días'
      },
      multiStep: {
        step: 'Paso',
        of: 'de',
        back: 'Atrás',
        next: 'Siguiente',
        submit: 'Enviar Solicitud',
        cancel: 'Cancelar',
        selectDates: 'Seleccionar Fechas',
        selectDatesDesc: 'Elige las fechas para tu solicitud de permiso',
        selectType: 'Tipo de Permiso',
        selectTypeDesc: 'Selecciona el tipo de ausencia que estás solicitando',
        addNotes: 'Notas Adicionales',
        addNotesDesc: 'Añade cualquier detalle o justificación',
        reviewRequest: 'Revisar Solicitud',
        reviewRequestDesc: 'Verifica los detalles antes de enviar',
        workingDaysRequested: 'Días laborables solicitados',
        holidayBalance: 'Balance de Vacaciones',
        total: 'Total',
        used: 'Utilizadas',
        remaining: 'Restantes',
        afterRequest: 'Después de esta solicitud:',
        daysRemaining: 'días restantes',
        conflictWarning: 'Las fechas seleccionadas se superponen con una solicitud existente',
        insufficientBalance: 'No tienes suficientes días de vacaciones disponibles para este período',
        checkingConflicts: 'Verificando conflictos con otras solicitudes...',
        employee: 'Empleado',
        email: 'Correo',
        startDate: 'Fecha de Inicio',
        endDate: 'Fecha de Fin',
        type: 'Tipo',
        workingDays: 'Días Laborables',
        finalWarning: 'Advertencia: esta solicitud excede tus días de vacaciones disponibles',
        absenceType: 'Tipo de Ausencia',
        vacationDescription: 'Vacaciones anuales - se deducen de tu asignación',
        sickDescription: 'Baja médica - certificado médico requerido',
        personalDescription: 'Permiso personal - para necesidades personales y familiares',
        characters: 'caracteres',
        medicalCertRequired: 'Certificado Médico Requerido',
        medicalCertRequiredDesc: 'El certificado médico es requerido para la baja médica. Puedes subirlo ahora o comprometerte a proporcionarlo más tarde.',
        medicalCertOptions: 'Opciones de Certificado Médico',
        uploadNow: 'Subir el certificado médico ahora',
        sendLater: 'Me comprometo a proporcionarlo más tarde por email a la dirección de la empresa',
        uploadMedicalCert: 'Subir Certificado Médico',
        selectFile: 'Haz clic para seleccionar archivo',
        dragFile: 'o arrástralo aquí',
        dropFile: 'Suelta el archivo aquí',
        fileFormats: 'PDF, DOC, DOCX, JPG, PNG (MÁX 5MB)',
        uploadDesc: 'Selecciona y sube el certificado médico en formato PDF, DOC, DOCX, o imagen (JPG/PNG)',
        commitmentConfirmed: 'Compromiso Confirmado',
        commitmentText: 'Te comprometes a proporcionar el certificado médico por email a la dirección de la empresa dentro de 3 días laborables de presentar esta solicitud.',
        invalidFileFormat: 'Formato de archivo inválido. Solo se admiten PDF, DOC, DOCX, JPG y PNG.'
      }
    },
    pageContent: {
      backButton: 'Atrás',
      loadingText: 'Cargando...',
      loadingData: 'Cargando datos...',
      subtitle: 'Completa el formulario para solicitar días de vacaciones, baja médica o días personales',
      statsCards: {
        availableDays: 'Días disponibles',
        pendingRequests: 'Pendientes',
        approvedRequests: 'Aprobadas'
      },
      helpSection: {
        title: 'Información Útil',
        leaveTypes: {
          title: 'Tipos de Ausencia',
          vacation: 'Vacaciones: Se descuentan del subsidio anual',
          sick: 'Baja Médica: Requiere certificado médico',
          personal: 'Día Personal: Para necesidades familiares'
        },
        approvalProcess: {
          title: 'Proceso de Aprobación',
          managerReview: 'Las solicitudes se envían al gerente',
          approvalTime: 'Tiempo de aprobación: 1-3 días laborables',
          emailNotification: 'Recibirás una notificación por email'
        }
      }
    },
    profile: {
      editTitle: 'Editar Perfil',
      nameLabel: 'Nombre Completo',
      emailLabel: 'Correo Electrónico',
      phoneLabel: 'Teléfono (opcional)',
      departmentLabel: 'Departamento',
      roleInfo: 'El rol solo puede ser modificado por administradores',
      confirmPasswordLabel: 'Confirmar Contraseña',
      confirmPasswordPlaceholder: 'Confirma nueva contraseña',
      cancel: 'Cancelar',
      save: 'Guardar Cambios',
      saving: 'Guardando...',
      validation: {
        nameMin: 'El nombre debe tener al menos 2 caracteres',
        emailInvalid: 'Correo electrónico inválido',
        phoneMin: 'El número de teléfono debe tener al menos 10 dígitos',
        jobTitleMin: 'El puesto debe tener al menos 2 caracteres',
        jobTitleMax: 'El puesto no puede exceder 100 caracteres',
      },
      errors: {
        generic: 'Error',
        unsupportedFormat: 'Formato de archivo no soportado. Usa: JPEG, PNG, GIF o WebP',
        fileTooLarge: 'Archivo muy grande. Tamaño máximo: 2MB',
        avatarUpload: 'Error durante la subida del avatar',
        avatarError: 'Error de Avatar',
        profileUpdate: 'Error durante la actualización',
        profileUpdateGeneric: 'Error durante la actualización del perfil',
      },
      success: {
        title: 'Éxito',
        profileUpdated: 'Perfil actualizado exitosamente',
      },
    },
  },
  holidayHistory: {
    title: 'Historial de Solicitudes',
    filters: {
      status: 'Estado',
      allStatuses: 'Todos los estados',
      type: 'Tipo',
      allTypes: 'Todos los tipos',
    },
    columns: {
      workingDays: 'Días laborables',
      days: 'Días',
    },
    statuses: {
      approved: 'Aprobada',
      pending: 'Pendiente',
      rejected: 'Rechazada',
      cancelled: 'Cancelada',
    },
    types: {
      vacation: 'Vacaciones',
      sick: 'Baja médica',
      personal: 'Personal',
    },
    actions: {
      delete: 'Eliminar',
    },
    messages: {
      noRequests: 'No se encontraron solicitudes',
      cancelError: 'Error al cancelar la solicitud',
      downloadError: 'Error al descargar el certificado',
      deleteError: 'Error al eliminar la solicitud',
      cancelNote: 'Cancelada por el empleado',
    },
  },
  roles: {
    admin: 'Administrador',
    employee: 'Empleado',
  },
  statusBadge: {
    pending: 'Pendiente',
    active: 'Activo',
    inactive: 'Inactivo',
  },
  validation: {
    startDateRequired: 'Fecha de inicio requerida',
    endDateRequired: 'Fecha de fin requerida',
    typeRequired: 'Selecciona el tipo de solicitud',
    notesOptional: 'Notas adicionales (opcional)',
    selectStartDate: 'Selecciona fecha de inicio',
    selectEndDate: 'Selecciona fecha de fin',
    selectLeaveType: 'Selecciona el tipo de ausencia',
    endDateAfterStart: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
    noPastDates: 'No se pueden solicitar permisos para fechas pasadas',
    noFutureDates: 'No se pueden solicitar permisos con más de un año de antelación',
    medicalCertRequired: 'El certificado médico es obligatorio para la baja médica',
  },
  multiStepForm: {
    steps: {
      date: {
        title: 'Fechas',
        description: 'Selecciona el período',
      },
      type: {
        title: 'Tipo',
        description: 'Tipo de permiso',
      },
      notes: {
        title: 'Notas', 
        description: 'Añadir detalles',
      },
      summary: {
        title: 'Resumen',
        description: 'Confirmar y enviar',
      },
      review: {
        title: 'Revisar Solicitud',
        description: 'Confirmar y enviar',
      },
      dates: {
        title: 'Fechas',
        description: 'Seleccionar fechas',
      },
    },
  },
} as const;

export default formsEs;