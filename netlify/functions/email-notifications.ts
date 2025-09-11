/**
 * Email Notifications Integration for OMNIA HOLIDAY TRACKER
 * Handles sending notifications for holiday workflow events
 * (employee registrations, holiday requests, approvals, rejections, etc.)
 * Now with multilingual support (IT/EN/ES)
 */

import { neon } from '@neondatabase/serverless';
import { 
  getUserPreferredLanguage, 
  getUserPreferredLanguageByEmail,
  generateLocalizedEmail,
  generateEmailHTML 
} from '../../lib/email/language-utils';
import { Locale } from '../../lib/i18n/config';

export const handler = async (event: any) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🏖️ Holiday Email Notifications Function Called');
    console.log('Method:', event.httpMethod);
    console.log('Body:', event.body);

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { action, userData, holidayData } = body;

    console.log('Action:', action);
    console.log('User data:', userData);
    console.log('Holiday data:', holidayData);

    const sql = neon(process.env.DATABASE_URL!);
    const baseUrl = process.env.SITE_URL || process.env.URL || 'https://omnia-holiday-tracker.netlify.app';

    // Helper function to check if notifications are enabled
    const isNotificationEnabled = async (settingName: string): Promise<boolean> => {
      try {
        const setting = await sql`
          SELECT setting_value, is_enabled FROM email_settings 
          WHERE setting_name = ${settingName}
        `;
        const settingRow = setting[0];
        return settingRow && 
               settingRow.is_enabled === true && 
               (settingRow.setting_value === 'true' || settingRow.setting_value === true);
      } catch (dbError) {
        console.log(`Email setting ${settingName} not found, defaulting to enabled`);
        return true; // Default to enabled for holiday notifications
      }
    };

    // Helper function to get admin email
    const getAdminEmail = async (): Promise<string> => {
      try {
        const adminEmailSetting = await sql`
          SELECT setting_value FROM email_settings 
          WHERE setting_name = 'admin_email'
        `;
        return adminEmailSetting[0]?.setting_value || 'max.giurastante@omniaservices.net';
      } catch (dbError) {
        console.log('Admin email setting not found, using default');
        return 'max.giurastante@omniaservices.net';
      }
    };

    // Helper function to send email directly via Resend (temporary fix)
    const sendEmail = async (emailData: any) => {
      try {
        console.log('📧 Sending email directly via Resend API');
        console.log('- To:', emailData.to);
        console.log('- Subject:', emailData.subject);
        
        if (!process.env.RESEND_API_KEY) {
          throw new Error('RESEND_API_KEY not configured');
        }
        
        // Use fetch directly to avoid dynamic import issues
        const emailRequest = {
          from: process.env.FROM_EMAIL || 'holidays@omniaelectronics.com',
          to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
          subject: emailData.subject,
          html: emailData.htmlContent
        };
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailRequest)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error('❌ Resend API error:', result);
          throw new Error(`Resend API error: ${result.message || 'Unknown error'}`);
        }
        
        console.log('✅ Email sent successfully, Message ID:', result.id);
        return { 
          emailResponse: { ok: true },
          emailResult: { success: true, messageId: result.id }
        };
        
      } catch (error: any) {
        console.error('❌ Direct email send failed:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }
    };

    // Employee Registration Notification to Admin
    if (action === 'employee_registration') {
      console.log('📧 Processing employee registration notification');
      
      const notificationsEnabled = await isNotificationEnabled('employee_registration_notifications');
      if (!notificationsEnabled) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Employee registration notifications disabled' })
        };
      }
      
      const adminEmail = await getAdminEmail();
      
      // Get admin's preferred language
      const adminLanguage = await getUserPreferredLanguageByEmail(adminEmail);
      console.log(`🌍 Admin language detected: ${adminLanguage}`);
      
      // Generate localized email content
      const localizedEmail = generateLocalizedEmail(
        adminLanguage, 
        'employee_registration',
        { userData, adminData: { name: 'Admin' } }
      );
      
      const htmlContent = generateEmailHTML(
        localizedEmail,
        'employee_registration',
        { userData, adminData: { name: 'Admin' } },
        baseUrl
      );
      
      const emailData = {
        action: 'send_immediate',
        to: adminEmail,
        subject: localizedEmail.subject,
        htmlContent: htmlContent
      };
      
      const { emailResult } = await sendEmail(emailData);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          emailSent: emailResult.success,
          message: 'Employee registration notification sent successfully'
        })
      };
    }

    // Holiday Request Notification to Admin/Manager
    if (action === 'holiday_request_submitted') {
      console.log('📧 Processing holiday request notification');
      
      const notificationsEnabled = await isNotificationEnabled('holiday_request_notifications');
      if (!notificationsEnabled) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Holiday request notifications disabled' })
        };
      }
      
      const adminEmail = await getAdminEmail();
      
      // Get admin's preferred language
      const adminLanguage = await getUserPreferredLanguageByEmail(adminEmail);
      console.log(`🌍 Admin language detected: ${adminLanguage}`);
      
      // Format dates according to locale
      const startDate = new Date(holidayData.startDate).toLocaleDateString(
        adminLanguage === 'en' ? 'en-US' : adminLanguage === 'es' ? 'es-ES' : 'it-IT'
      );
      const endDate = new Date(holidayData.endDate).toLocaleDateString(
        adminLanguage === 'en' ? 'en-US' : adminLanguage === 'es' ? 'es-ES' : 'it-IT'
      );
      
      // Generate localized email content
      const localizedEmail = generateLocalizedEmail(
        adminLanguage, 
        'holiday_request_submitted',
        { 
          userData, 
          holidayData: {
            ...holidayData,
            startDate,
            endDate
          }
        }
      );
      
      const htmlContent = generateEmailHTML(
        localizedEmail,
        'holiday_request_submitted',
        { 
          userData, 
          holidayData: {
            ...holidayData,
            startDate,
            endDate
          }
        },
        baseUrl
      );
      
      const emailData = {
        action: 'send_immediate',
        to: adminEmail,
        subject: localizedEmail.subject,
        htmlContent: htmlContent
      };
      
      const { emailResult } = await sendEmail(emailData);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          emailSent: emailResult.success,
          message: 'Holiday request notification sent successfully'
        })
      };
    }

    // Holiday Request Approved Notification to Employee
    if (action === 'holiday_request_approved') {
      console.log('📧 Processing holiday approval notification');
      
      // Get employee's preferred language
      const employeeLanguage = await getUserPreferredLanguageByEmail(userData.email);
      console.log(`🌍 Employee language detected: ${employeeLanguage}`);
      
      // Format dates according to locale
      const startDate = new Date(holidayData.startDate).toLocaleDateString(
        employeeLanguage === 'en' ? 'en-US' : employeeLanguage === 'es' ? 'es-ES' : 'it-IT'
      );
      const endDate = new Date(holidayData.endDate).toLocaleDateString(
        employeeLanguage === 'en' ? 'en-US' : employeeLanguage === 'es' ? 'es-ES' : 'it-IT'
      );
      
      // Generate localized email content
      const localizedEmail = generateLocalizedEmail(
        employeeLanguage, 
        'holiday_request_approved',
        { 
          userData, 
          holidayData: {
            ...holidayData,
            startDate,
            endDate
          },
          adminData: { name: holidayData.approvedBy || 'Administrator' }
        }
      );
      
      const htmlContent = generateEmailHTML(
        localizedEmail,
        'holiday_request_approved',
        { 
          userData, 
          holidayData: {
            ...holidayData,
            startDate,
            endDate
          },
          adminData: { name: holidayData.approvedBy || 'Administrator' }
        },
        baseUrl
      );
      
      const emailData = {
        action: 'send_immediate',
        to: userData.email,
        subject: localizedEmail.subject,
        htmlContent: htmlContent
      };
      
      const { emailResult } = await sendEmail(emailData);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          emailSent: emailResult.success,
          message: 'Holiday approval notification sent successfully'
        })
      };
    }

    // Holiday Request Rejected Notification to Employee
    if (action === 'holiday_request_rejected') {
      console.log('📧 Processing holiday rejection notification');
      
      // Get employee's preferred language
      const employeeLanguage = await getUserPreferredLanguageByEmail(userData.email);
      console.log(`🌍 Employee language detected: ${employeeLanguage}`);
      
      // Format dates according to locale
      const startDate = new Date(holidayData.startDate).toLocaleDateString(
        employeeLanguage === 'en' ? 'en-US' : employeeLanguage === 'es' ? 'es-ES' : 'it-IT'
      );
      const endDate = new Date(holidayData.endDate).toLocaleDateString(
        employeeLanguage === 'en' ? 'en-US' : employeeLanguage === 'es' ? 'es-ES' : 'it-IT'
      );
      
      // Generate localized email content
      const localizedEmail = generateLocalizedEmail(
        employeeLanguage, 
        'holiday_request_rejected',
        { 
          userData, 
          holidayData: {
            ...holidayData,
            startDate,
            endDate
          },
          adminData: { name: holidayData.rejectedBy || 'Administrator' },
          rejectionReason: holidayData.rejectionReason
        }
      );
      
      const htmlContent = generateEmailHTML(
        localizedEmail,
        'holiday_request_rejected',
        { 
          userData, 
          holidayData: {
            ...holidayData,
            startDate,
            endDate
          },
          adminData: { name: holidayData.rejectedBy || 'Administrator' },
          rejectionReason: holidayData.rejectionReason
        },
        baseUrl
      );
      
      const emailData = {
        action: 'send_immediate',
        to: userData.email,
        subject: localizedEmail.subject,
        htmlContent: htmlContent
      };
      
      const { emailResult } = await sendEmail(emailData);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          emailSent: emailResult.success,
          message: 'Holiday rejection notification sent successfully'
        })
      };
    }

    // Employee Account Approved
    if (action === 'employee_approved') {
      console.log('📧 Processing employee approval notification');
      
      // Get employee's preferred language
      const employeeLanguage = await getUserPreferredLanguageByEmail(userData.email);
      console.log(`🌍 Employee language detected: ${employeeLanguage}`);
      
      // Generate localized email content
      const localizedEmail = generateLocalizedEmail(
        employeeLanguage, 
        'employee_approved',
        { 
          userData,
          adminData: { name: 'Administrator' }
        }
      );
      
      const htmlContent = generateEmailHTML(
        localizedEmail,
        'employee_approved',
        { 
          userData,
          adminData: { name: 'Administrator' }
        },
        baseUrl
      );
      
      const emailData = {
        action: 'send_immediate',
        to: userData.email,
        subject: localizedEmail.subject,
        htmlContent: htmlContent
      };
      
      const { emailResult } = await sendEmail(emailData);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          emailSent: emailResult.success,
          message: 'Employee approval notification sent successfully'
        })
      };
    }

    // Holiday Starting Reminder
    if (action === 'holiday_starting_reminder') {
      console.log('📧 Processing holiday starting reminder');
      
      const adminEmail = await getAdminEmail();
      const startDate = new Date(holidayData.startDate).toLocaleDateString('it-IT');
      
      const emailData = {
        action: 'send_immediate',
        to: adminEmail,
        subject: `🏖️ Promemoria: ${userData.name} inizia le ferie domani`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; }
              .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f8f9fa; }
              .reminder-box { background: #fef3c7; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏰ Promemoria Ferie</h1>
              </div>
              <div class="content">
                <div class="reminder-box">
                  <h3>🏖️ Ferie in partenza</h3>
                  <p><strong>${userData.name}</strong> inizia le ferie il <strong>${startDate}</strong></p>
                </div>
                <p>Assicurati che tutto sia organizzato per coprire le sue responsabilità durante l'assenza.</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 OmniaServices. All rights reserved.</p>
                <p>Promemoria automatico da OMNIA HOLIDAY TRACKER.</p>
              </div>
            </div>
          </body>
          </html>
        `
      };
      
      const { emailResult } = await sendEmail(emailData);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          emailSent: emailResult.success,
          message: 'Holiday reminder sent successfully'
        })
      };
    }

    // Email Settings Management Actions
    if (action === 'initialize_settings') {
      console.log('🔧 Initializing holiday email settings');
      
      const defaultSettings = [
        ['employee_registration_notifications', 'true', true],
        ['holiday_request_notifications', 'true', true], 
        ['holiday_approval_notifications', 'true', true],
        ['holiday_reminder_notifications', 'true', true],
        ['admin_email', 'max.giurastante@omniaservices.net', true]
      ];
      
      for (const [settingName, settingValue, isEnabled] of defaultSettings) {
        await sql`
          INSERT INTO email_settings (setting_name, setting_value, is_enabled)
          VALUES (${settingName}, ${settingValue}, ${isEnabled})
          ON CONFLICT (setting_name) DO NOTHING
        `;
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: 'Holiday email settings initialized successfully'
        })
      };
    }

    if (action === 'get_settings') {
      console.log('📧 Getting holiday email settings');
      
      const settings = await sql`
        SELECT setting_name, setting_value, is_enabled 
        FROM email_settings 
        ORDER BY setting_name
      `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          settings: settings
        })
      };
    }

    if (action === 'update_setting') {
      console.log('📧 Updating holiday email setting');
      const { settingName, isEnabled, settingValue } = body;
      
      await sql`
        UPDATE email_settings 
        SET is_enabled = ${isEnabled}, 
            setting_value = ${settingValue || 'true'}
        WHERE setting_name = ${settingName}
      `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: `Setting ${settingName} updated successfully`
        })
      };
    }

    // Unknown action
    console.error('❌ Unknown action:', action);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: `Unknown action: ${action}`,
        availableActions: [
          'employee_registration',
          'holiday_request_submitted', 
          'holiday_request_approved',
          'holiday_request_rejected',
          'employee_approved',
          'holiday_starting_reminder',
          'initialize_settings',
          'get_settings',
          'update_setting'
        ]
      })
    };
    
  } catch (error: any) {
    console.error('❌ Holiday email notifications error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message, 
        stack: error.stack,
        name: error.name
      })
    };
  }
};