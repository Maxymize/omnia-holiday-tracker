/**
 * Email translations in English
 * For OMNIA HOLIDAY TRACKER notification system
 */

export const emailTranslations = {
  subjects: {
    employee_registration: '🆕 New Employee Registered - {name}',
    holiday_request_submitted: '📝 New Holiday Request from {name}',
    holiday_request_approved: '✅ Holiday Request Approved',
    holiday_request_rejected: '❌ Holiday Request Rejected',
    employee_approved: '👋 Welcome to OMNIA HOLIDAY TRACKER!',
    holiday_starting_reminder: '🏖️ Reminder: Your Holiday Starts Tomorrow'
  },

  templates: {
    employee_registration: {
      title: 'New Employee Registered',
      greeting: 'A new employee has registered in the holiday system:',
      fields: {
        name: 'Name',
        email: 'Email', 
        department: 'Department',
        jobTitle: 'Role',
        phone: 'Phone',
        holidayAllowance: 'Annual Holiday Days',
        registrationDate: 'Registration Date',
        status: 'Status'
      },
      values: {
        notAssigned: 'Not assigned',
        notSpecified: 'Not specified',
        notProvided: 'Not provided',
        pendingApproval: 'Awaiting approval'
      },
      message: 'Access the admin panel to approve the employee and activate their account.',
      buttonText: 'Approve Employee'
    },

    holiday_request_submitted: {
      title: 'New Holiday Request',
      greeting: 'A new holiday request has been submitted that requires your approval:',
      fields: {
        employee: 'Employee',
        period: 'Period',
        days: 'Requested Days',
        type: 'Type',
        notes: 'Notes',
        status: 'Status'
      },
      types: {
        vacation: 'Vacation',
        sick: 'Sick Leave',
        personal: 'Personal'
      },
      message: 'Review the request and make an approval decision.',
      buttonText: 'Manage Requests'
    },

    holiday_request_approved: {
      title: 'Holiday Request Approved',
      greeting: 'Good news! Your holiday request has been approved:',
      fields: {
        period: 'Period',
        days: 'Requested Days',
        type: 'Type',
        approvedBy: 'Approved By',
        approvedOn: 'Approval Date'
      },
      message: 'Your holiday request has been approved. Have a great vacation!',
      buttonText: 'View Dashboard'
    },

    holiday_request_rejected: {
      title: 'Holiday Request Rejected',
      greeting: 'Unfortunately, your holiday request has not been approved.',
      fields: {
        period: 'Period',
        days: 'Requested Days',
        rejectedBy: 'Rejected By',
        reason: 'Reason'
      },
      values: {
        noReasonSpecified: 'Not specified'
      },
      message: 'You can submit a new request for different dates or contact your manager for further clarification.',
      buttonText: 'New Request'
    },

    employee_approved: {
      title: 'Welcome to OMNIA HOLIDAY TRACKER!',
      greeting: 'Your account has been approved and activated.',
      fields: {
        name: 'Name',
        email: 'Email',
        department: 'Department',
        jobTitle: 'Role',
        holidayAllowance: 'Annual Holiday Days',
        approvedBy: 'Approved By'
      },
      message: 'You can now log into the system and start managing your holiday requests.',
      buttonText: 'Access System'
    }
  },

  common: {
    footer: {
      copyright: '© 2025 OmniaServices. All rights reserved.',
      automated: 'Automated notification from OMNIA HOLIDAY TRACKER.'
    },
    buttons: {
      viewDashboard: 'View Dashboard',
      manageRequests: 'Manage Requests',
      newRequest: 'New Request',
      loginSystem: 'Access System'
    }
  }
};

export default emailTranslations;