/**
 * Language utilities for email system
 * Handles user language detection and email localization
 */

import { neon } from '@neondatabase/serverless';
import { Locale } from '../i18n/config';
import { getEmailTranslations, interpolateEmailSubject } from '../i18n/translations/emails';

// Get database connection helper
function getDbConnection() {
  const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED || 
                process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('No database connection URL available');
  }
  
  return neon(dbUrl);
}

/**
 * Get user's preferred language from database
 * @param userId User ID to look up
 * @returns User's preferred language or 'it' as default
 */
export async function getUserPreferredLanguage(userId: string): Promise<Locale> {
  try {
    console.log(`🔍 Looking up preferred language for user: ${userId}`);
    
    const sql = getDbConnection();
    const result = await sql`
      SELECT preferred_language 
      FROM users 
      WHERE id = ${userId}
      LIMIT 1
    `;
    
    if (result.length === 0) {
      console.log(`⚠️ User ${userId} not found, defaulting to 'it'`);
      return 'it';
    }
    
    const language = result[0].preferred_language as Locale;
    console.log(`✅ User ${userId} preferred language: ${language}`);
    
    // Validate language is supported
    if (!['it', 'en', 'es'].includes(language)) {
      console.log(`⚠️ Invalid language ${language}, defaulting to 'it'`);
      return 'it';
    }
    
    return language;
  } catch (error) {
    console.error(`❌ Error getting user language for ${userId}:`, error);
    return 'it'; // Safe fallback
  }
}

/**
 * Get user's preferred language by email address
 * @param userEmail Email address to look up
 * @returns User's preferred language or 'it' as default
 */
export async function getUserPreferredLanguageByEmail(userEmail: string): Promise<Locale> {
  try {
    console.log(`🔍 Looking up preferred language for email: ${userEmail}`);
    
    const sql = getDbConnection();
    const result = await sql`
      SELECT preferred_language 
      FROM users 
      WHERE email = ${userEmail}
      LIMIT 1
    `;
    
    if (result.length === 0) {
      console.log(`⚠️ User ${userEmail} not found, defaulting to 'it'`);
      return 'it';
    }
    
    const language = result[0].preferred_language as Locale;
    console.log(`✅ User ${userEmail} preferred language: ${language}`);
    
    // Validate language is supported
    if (!['it', 'en', 'es'].includes(language)) {
      console.log(`⚠️ Invalid language ${language}, defaulting to 'it'`);
      return 'it';
    }
    
    return language;
  } catch (error) {
    console.error(`❌ Error getting user language for ${userEmail}:`, error);
    return 'it'; // Safe fallback
  }
}

/**
 * Smart language detection based on email domain (optional fallback)
 * @param email Email address 
 * @returns Detected language based on domain patterns
 */
export function detectLanguageFromEmail(email: string): Locale {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) return 'it';
  
  // Domain-based language detection patterns
  const languagePatterns: Record<string, Locale> = {
    // Spanish domains
    'gmail.es': 'es',
    'hotmail.es': 'es',
    'yahoo.es': 'es',
    // English domains  
    'gmail.com': 'en',
    'hotmail.com': 'en',
    'yahoo.com': 'en',
    'outlook.com': 'en',
    // Italian domains (default)
    'gmail.it': 'it',
    'hotmail.it': 'it',
    'yahoo.it': 'it',
  };
  
  // Check for exact domain match
  if (languagePatterns[domain]) {
    return languagePatterns[domain];
  }
  
  // Check for domain patterns
  if (domain.endsWith('.es')) return 'es';
  if (domain.endsWith('.com') || domain.endsWith('.org') || domain.endsWith('.net')) return 'en';
  if (domain.endsWith('.it')) return 'it';
  
  // Default to Italian for unknown domains
  return 'it';
}

/**
 * Generate localized email content
 * @param locale User's preferred language
 * @param templateName Email template name 
 * @param data Data to populate template
 * @returns Localized email subject and content
 */
export function generateLocalizedEmail(
  locale: Locale, 
  templateName: string,
  data: any
) {
  const translations = getEmailTranslations(locale);
  
  // Generate subject with interpolation
  const subjectTemplate = (translations.subjects as any)[templateName] || '';
  const subject = interpolateEmailSubject(subjectTemplate, {
    name: data.userData?.name || data.name || '',
    ...data
  });
  
  return {
    locale,
    subject,
    translations: (translations.templates as any)[templateName] || {},
    common: translations.common
  };
}

/**
 * Generate HTML email template with localized content
 * @param emailData Generated email data from generateLocalizedEmail
 * @param templateName Template name
 * @param data Original data
 * @param baseUrl Base URL for links
 * @returns Complete HTML email
 */
export function generateEmailHTML(
  emailData: ReturnType<typeof generateLocalizedEmail>,
  templateName: string,
  data: any,
  baseUrl: string
): string {
  const { translations, common } = emailData;
  
  // Base email styles
  const styles = `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f8f9fa; }
    .info-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2563eb; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    ul { list-style: none; padding: 0; }
    li { margin: 8px 0; }
    .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .success-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; border-radius: 5px; }
  `;
  
  // Get appropriate button URL based on template
  let buttonUrl = baseUrl;
  let buttonText = common.buttons.viewDashboard;
  
  switch (templateName) {
    case 'employee_registration':
      buttonUrl = `${baseUrl}/admin/employees`;
      buttonText = translations.buttonText || common.buttons.manageRequests;
      break;
    case 'holiday_request_submitted':
      buttonUrl = `${baseUrl}/admin/holidays`;
      buttonText = translations.buttonText || common.buttons.manageRequests;
      break;
    case 'holiday_request_approved':
      buttonUrl = `${baseUrl}/dashboard`;
      buttonText = translations.buttonText || common.buttons.viewDashboard;
      break;
    case 'holiday_request_rejected':
      buttonUrl = `${baseUrl}/dashboard`;
      buttonText = translations.buttonText || common.buttons.newRequest;
      break;
    case 'employee_approved':
      buttonUrl = `${baseUrl}`;
      buttonText = translations.buttonText || common.buttons.loginSystem;
      break;
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>${styles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏖️ ${translations.title || 'OMNIA HOLIDAY TRACKER'}</h1>
        </div>
        <div class="content">
          <p><strong>${translations.greeting || 'Notification from OMNIA HOLIDAY TRACKER'}</strong></p>
          ${generateTemplateContent(templateName, translations, data)}
          <p>${translations.message || ''}</p>
          <div style="text-align: center;">
            <a href="${buttonUrl}" class="button">
              ${buttonText}
            </a>
          </div>
        </div>
        <div class="footer">
          <p>${common.footer.copyright}</p>
          <p>${common.footer.automated}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate template-specific content based on email type
 */
function generateTemplateContent(templateName: string, translations: any, data: any): string {
  switch (templateName) {
    case 'employee_registration':
      return `
        <div class="info-box">
          <ul>
            <li><strong>👤 ${translations.fields?.name || 'Nome'}:</strong> ${data.userData?.name || ''}</li>
            <li><strong>📧 ${translations.fields?.email || 'Email'}:</strong> ${data.userData?.email || ''}</li>
            <li><strong>🏢 ${translations.fields?.department || 'Dipartimento'}:</strong> ${data.userData?.department || translations.values?.notAssigned || 'Non assegnato'}</li>
            <li><strong>💼 ${translations.fields?.jobTitle || 'Ruolo'}:</strong> ${data.userData?.jobTitle || translations.values?.notSpecified || 'Non specificato'}</li>
            <li><strong>📱 ${translations.fields?.phone || 'Telefono'}:</strong> ${data.userData?.phone || translations.values?.notProvided || 'Non fornito'}</li>
            <li><strong>🏖️ ${translations.fields?.holidayAllowance || 'Giorni ferie'}:</strong> ${data.userData?.holidayAllowance || 20}</li>
            <li><strong>🕒 ${translations.fields?.registrationDate || 'Data registrazione'}:</strong> ${new Date().toLocaleDateString()}</li>
            <li><strong>⚠️ ${translations.fields?.status || 'Stato'}:</strong> ${translations.values?.pendingApproval || 'In attesa di approvazione'}</li>
          </ul>
        </div>
      `;
      
    case 'holiday_request_submitted':
      return `
        <div class="info-box">
          <ul>
            <li><strong>👤 ${translations.fields?.employee || 'Dipendente'}:</strong> ${data.userData?.name || ''}</li>
            <li><strong>📅 ${translations.fields?.period || 'Periodo'}:</strong> ${data.holidayData?.startDate} - ${data.holidayData?.endDate}</li>
            <li><strong>📊 ${translations.fields?.days || 'Giorni'}:</strong> ${data.holidayData?.workingDays}</li>
            <li><strong>🏷️ ${translations.fields?.type || 'Tipo'}:</strong> ${translations.types?.[data.holidayData?.type] || data.holidayData?.type}</li>
            <li><strong>📝 ${translations.fields?.notes || 'Note'}:</strong> ${data.holidayData?.notes || '-'}</li>
          </ul>
        </div>
      `;
      
    case 'holiday_request_approved':
      return `
        <div class="success-box">
          <ul>
            <li><strong>📅 ${translations.fields?.period || 'Periodo'}:</strong> ${data.holidayData?.startDate} - ${data.holidayData?.endDate}</li>
            <li><strong>📊 ${translations.fields?.days || 'Giorni'}:</strong> ${data.holidayData?.workingDays}</li>
            <li><strong>🏷️ ${translations.fields?.type || 'Tipo'}:</strong> ${translations.types?.[data.holidayData?.type] || data.holidayData?.type}</li>
            <li><strong>✅ ${translations.fields?.approvedBy || 'Approvato da'}:</strong> ${data.adminData?.name || 'Amministratore'}</li>
            <li><strong>📅 ${translations.fields?.approvedOn || 'Data approvazione'}:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
        </div>
      `;
      
    case 'holiday_request_rejected':
      return `
        <div class="warning-box">
          <ul>
            <li><strong>📅 ${translations.fields?.period || 'Periodo'}:</strong> ${data.holidayData?.startDate} - ${data.holidayData?.endDate}</li>
            <li><strong>📊 ${translations.fields?.days || 'Giorni'}:</strong> ${data.holidayData?.workingDays}</li>
            <li><strong>❌ ${translations.fields?.rejectedBy || 'Rifiutata da'}:</strong> ${data.adminData?.name || 'Amministratore'}</li>
            <li><strong>💬 ${translations.fields?.reason || 'Motivo'}:</strong> ${data.rejectionReason || translations.values?.noReasonSpecified || 'Non specificato'}</li>
          </ul>
        </div>
      `;
      
    case 'employee_approved':
      return `
        <div class="success-box">
          <ul>
            <li><strong>👤 ${translations.fields?.name || 'Nome'}:</strong> ${data.userData?.name || ''}</li>
            <li><strong>📧 ${translations.fields?.email || 'Email'}:</strong> ${data.userData?.email || ''}</li>
            <li><strong>🏢 ${translations.fields?.department || 'Dipartimento'}:</strong> ${data.userData?.department || translations.values?.notAssigned || 'Non assegnato'}</li>
            <li><strong>💼 ${translations.fields?.jobTitle || 'Ruolo'}:</strong> ${data.userData?.jobTitle || translations.values?.notSpecified || 'Non specificato'}</li>
            <li><strong>🏖️ ${translations.fields?.holidayAllowance || 'Giorni ferie'}:</strong> ${data.userData?.holidayAllowance || 20}</li>
            <li><strong>✅ ${translations.fields?.approvedBy || 'Approvato da'}:</strong> ${data.adminData?.name || 'Amministratore'}</li>
          </ul>
        </div>
      `;
      
    default:
      return '<div class="info-box"><p>Dettagli della notifica non disponibili.</p></div>';
  }
}