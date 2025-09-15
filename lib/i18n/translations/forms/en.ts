const formsEn = {
  holidays: {
    request: {
      title: 'New Holiday Request',
      modalTitle: 'Holiday Request',
      modalDescription: 'Complete the form to request a new holiday period',
      startDate: 'Start date',
      endDate: 'End date',
      type: 'Leave type',
      types: {
        vacation: 'Vacation',
        sick: 'Sick leave',
        personal: 'Personal day',
      },
      notes: 'Notes (optional)',
      workingDays: 'Working days',
      submit: 'Submit request',
      success: 'Request submitted successfully',
      overlap: 'Dates overlap with another request',
      insufficientDays: 'Insufficient available days',
      steps: {
        dates: 'Select Dates',
        dateDescription: 'Select the period',
        type: 'Leave Type',
        typeDescription: 'Type of leave',
        notes: 'Additional Notes',
        notesDescription: 'Add details',
        review: {
          title: 'Summary',
          description: 'Confirm and submit'
        }
      },
      stepTitles: {
        selectPeriod: 'Select Period',
        selectPeriodDescription: 'Choose the dates for your leave request',
        leaveType: 'Leave Type',
        leaveTypeDescription: 'Select the type of absence you are requesting',
        additionalNotes: 'Additional Notes',
        additionalNotesDescription: 'Add any details or justifications',
        summary: 'Request Summary',
        summaryDescription: 'Review the details before submitting'
      },
      dateLabels: {
        startDate: 'Start Date',
        endDate: 'End Date',
        startDateHelper: 'First day of leave (not working)',
        endDateHelper: 'Last day of leave (return to work the next day)',
        workingDaysRequested: 'Working days requested',
        days: 'days'
      },
      multiStep: {
        step: 'Step',
        of: 'of',
        back: 'Back',
        next: 'Next',
        cancel: 'Cancel',
        submit: 'Submit Request',
        selectDates: 'Select Dates',
        selectDatesDesc: 'Choose the dates for your leave request',
        selectType: 'Leave Type',
        selectTypeDesc: 'Select the type of leave you are requesting',
        addNotes: 'Additional Notes',
        addNotesDesc: 'Add any details or justifications',
        reviewRequest: 'Review Request',
        reviewRequestDesc: 'Verify details before submitting',
        workingDaysRequested: 'Working days requested',
        holidayBalance: 'Holiday Balance',
        total: 'Total',
        used: 'Used',
        remaining: 'Remaining',
        afterRequest: 'After this request:',
        daysRemaining: 'days remaining',
        conflictWarning: 'Selected dates overlap with an existing request',
        insufficientBalance: 'You do not have enough holiday days available for this period',
        checkingConflicts: 'Checking conflicts with other requests...',
        employee: 'Employee',
        email: 'Email',
        startDate: 'Start Date',
        endDate: 'End Date',
        type: 'Type',
        workingDays: 'Working Days',
        finalWarning: 'Warning: this request exceeds your available holiday days',
        absenceType: 'Leave Type',
        vacationDescription: 'Annual holidays - deducted from your allowance',
        sickDescription: 'Sick leave - medical certificate required',
        personalDescription: 'Personal leave - for personal and family needs',
        characters: 'characters',
        medicalCertRequired: 'Medical Certificate Required',
        medicalCertRequiredDesc: 'Medical certificate is required for sick leave. You can upload it now or commit to provide it later.',
        medicalCertOptions: 'Medical Certificate Options',
        uploadNow: 'Upload the medical certificate now',
        sendLater: 'I commit to provide it later via email to company management',
        uploadMedicalCert: 'Upload Medical Certificate',
        selectFile: 'Click to select file',
        dragFile: 'or drag it here',
        dropFile: 'Drop file here',
        fileFormats: 'PDF, DOC, DOCX, JPG, PNG (MAX 5MB)',
        uploadDesc: 'Select and upload the medical certificate in PDF, DOC, DOCX, or image format (JPG/PNG)',
        commitmentConfirmed: 'Commitment Confirmed',
        commitmentText: 'You commit to provide the medical certificate via email to company management within 3 working days of submitting this request.',
        invalidFileFormat: 'Invalid file format. Only PDF, DOC, DOCX, JPG and PNG are supported.',
        supportedFormats: 'Supported formats: PDF, JPG, PNG, GIF, WebP. Maximum size: 4MB per file.',
        fileTooLarge: 'File too large ({{size}}). Maximum allowed size: {{maxSize}}.'
      }
    },
    pageContent: {
      backButton: 'Back',
      loadingText: 'Loading...',
      loadingData: 'Loading data...',
      subtitle: 'Complete the form to request vacation days, sick leave, or personal days',
      statsCards: {
        availableDays: 'Available days',
        pendingRequests: 'Pending',
        approvedRequests: 'Approved'
      },
      helpSection: {
        title: 'Useful Information',
        leaveTypes: {
          title: 'Types of Leave',
          vacation: 'Vacation: Deducted from annual allowance',
          sick: 'Sick Leave: Medical certificate required',
          personal: 'Personal Leave: For family needs'
        },
        approvalProcess: {
          title: 'Approval Process',
          managerReview: 'Requests are sent to the manager',
          approvalTime: 'Approval time: 1-3 business days',
          emailNotification: 'You will receive an email notification'
        }
      }
    },
    profile: {
      editTitle: 'Edit Profile',
      nameLabel: 'Full Name',
      emailLabel: 'Email',
      phoneLabel: 'Phone (optional)',
      departmentLabel: 'Department',
      roleInfo: 'Role can only be modified by administrators',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Confirm new password',
      cancel: 'Cancel',
      save: 'Save Changes',
      saving: 'Saving...',
      validation: {
        nameMin: 'Name must have at least 2 characters',
        emailInvalid: 'Invalid email',
        phoneMin: 'Phone number must have at least 10 digits',
        jobTitleMin: 'Job title must have at least 2 characters',
        jobTitleMax: 'Job title cannot exceed 100 characters',
      },
      errors: {
        generic: 'Error',
        unsupportedFormat: 'Unsupported file format. Use: JPEG, PNG, GIF or WebP',
        fileTooLarge: 'File too large. Maximum size: 2MB',
        avatarUpload: 'Error during avatar upload',
        avatarError: 'Avatar Error',
        profileUpdate: 'Error during update',
        profileUpdateGeneric: 'Error during profile update',
      },
      success: {
        title: 'Success',
        profileUpdated: 'Profile updated successfully',
      },
    },
  },
  holidayHistory: {
    title: 'Request History',
    filters: {
      status: 'Status',
      allStatuses: 'All statuses',
      type: 'Type',
      allTypes: 'All types',
    },
    columns: {
      workingDays: 'Working days',
      days: 'Days',
    },
    statuses: {
      approved: 'Approved',
      pending: 'Pending',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
    },
    types: {
      vacation: 'Vacation',
      sick: 'Sick leave',
      personal: 'Personal',
    },
    actions: {
      delete: 'Delete',
    },
    messages: {
      noRequests: 'No requests found',
      cancelError: 'Error cancelling request',
      downloadError: 'Error downloading certificate',
      deleteError: 'Error deleting request',
      cancelNote: 'Cancelled by employee',
    },
  },
  roles: {
    admin: 'Administrator',
    employee: 'Employee',
  },
  statusBadge: {
    pending: 'Pending',
    active: 'Active',
    inactive: 'Inactive',
  },
  validation: {
    startDateRequired: 'Start date required',
    endDateRequired: 'End date required',
    typeRequired: 'Select request type',
    notesOptional: 'Additional notes (optional)',
    selectStartDate: 'Select start date',
    selectEndDate: 'Select end date',
    selectLeaveType: 'Select leave type',
    endDateAfterStart: 'End date must be equal to or after start date',
    noPastDates: 'Cannot request leave for past dates',
    noFutureDates: 'Cannot request leave more than one year in advance',
    medicalCertRequired: 'Medical certificate is required for sick leave',
  },
  multiStepForm: {
    steps: {
      date: {
        title: 'Dates',
        description: 'Select the period',
      },
      type: {
        title: 'Type',
        description: 'Type of leave',
      },
      notes: {
        title: 'Notes', 
        description: 'Add details',
      },
      summary: {
        title: 'Summary',
        description: 'Confirm and submit',
      },
      review: {
        title: 'Summary',
        description: 'Confirm and submit',
      },
      dates: {
        title: 'Dates',
        description: 'Select dates',
      },
    },
  },
} as const;

export default formsEn;