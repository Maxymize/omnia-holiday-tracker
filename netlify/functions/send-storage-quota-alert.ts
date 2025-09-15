/**
 * Storage Quota Alert Email Function for OMNIA HOLIDAY TRACKER
 * Sends email alerts to administrators when storage limits are reached
 * Automatically detects admins and sends emails in their preferred language
 */

import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { getUserPreferredLanguageByEmail } from '../../lib/email/language-utils';

const sql = neon(process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '');
const FROM_EMAIL = process.env.FROM_EMAIL || 'holidays@omniaservices.net';

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Send email using the existing email service
 */
async function sendEmailViaService(to: string, subject: string, htmlContent: string) {
  try {
    const emailServiceUrl = `${process.env.NETLIFY_SITE_URL || 'http://localhost:3000'}/.netlify/functions/email-service`;

    const response = await fetch(emailServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send_immediate',
        to: to,
        subject: subject,
        htmlContent: htmlContent
      })
    });

    const result = await response.json();
    return {
      success: response.ok && result.success,
      data: result.data,
      error: result.message || 'Unknown error'
    };
  } catch (error: any) {
    console.error('❌ Error calling email service:', error);
    return {
      success: false,
      error: error.message || 'Failed to call email service'
    };
  }
}

/**
 * Get all active admin users with their preferred languages
 */
async function getActiveAdmins() {
  try {
    const adminUsers = await sql`
      SELECT id, email, name, preferred_language
      FROM users
      WHERE role = 'admin'
        AND status = 'active'
      ORDER BY name
    `;

    console.log(`📋 Found ${adminUsers.length} active admin users`);

    return {
      success: true,
      admins: adminUsers.map((admin: any) => ({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        preferredLanguage: admin.preferred_language || 'it'
      }))
    };
  } catch (error: any) {
    console.error('❌ Error getting admin users:', error);
    return {
      success: false,
      error: error.message,
      admins: []
    };
  }
}

/**
 * Get current storage usage
 */
async function getCurrentStorageUsage() {
  try {
    const storageStats = await sql`
      SELECT
        COUNT(*) as total_files,
        COALESCE(SUM(file_size), 0) as total_size_bytes,
        AVG(file_size) as average_file_size
      FROM medical_certificates
    `;

    const totalSizeBytes = parseInt(storageStats[0]?.total_size_bytes || '0');
    const totalFiles = parseInt(storageStats[0]?.total_files || '0');
    const averageSize = parseFloat(storageStats[0]?.average_file_size || '0');

    // Storage limits (100GB free tier)
    const FREE_TIER_STORAGE = 100 * 1024 * 1024 * 1024; // 100 GB in bytes
    const usagePercentage = Math.round((totalSizeBytes / FREE_TIER_STORAGE) * 100);

    return {
      success: true,
      totalFiles,
      totalSizeBytes,
      averageSize,
      usagePercentage,
      formattedTotalSize: formatBytes(totalSizeBytes),
      formattedLimit: formatBytes(FREE_TIER_STORAGE),
      isNearLimit: usagePercentage >= 80,
      isCritical: usagePercentage >= 95
    };
  } catch (error: any) {
    console.error('❌ Error getting storage usage:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get translations for storage quota alert emails
 */
function getStorageAlertTranslations(language: string) {
  const translations = {
    it: {
      alertTitle: 'Avviso Quota Storage',
      testNotice: 'EMAIL DI TEST',
      testDescription: 'Questa è una email di test per verificare che il sistema di avviso quota storage funzioni correttamente.',
      storageUsageAlert: 'Avviso Utilizzo Storage',
      alertDescription: {
        critical: 'L\'utilizzo storage di <strong>OMNIA Holiday Tracker</strong> ha superato il {percentage}% della quota allocata.',
        warning: 'L\'utilizzo storage di <strong>OMNIA Holiday Tracker</strong> ha raggiunto il {percentage}% della quota allocata.',
        test: 'L\'utilizzo storage di <strong>OMNIA Holiday Tracker</strong> è al {percentage}% della quota allocata.'
      },
      actionRequired: 'I nuovi caricamenti di file sono attualmente bloccati per prevenire interruzioni del servizio.',
      warningMessage: 'Lo spazio di archiviazione sta finendo. Si prega di rivedere e pulire i file non necessari.',
      currentStorageStats: 'Statistiche Storage Attuali',
      storageUsed: 'Storage Utilizzato',
      storageLimit: 'Limite Storage',
      totalFiles: 'File Totali',
      usagePercentage: 'Percentuale Utilizzo',
      immediateActions: 'Azioni Immediate Richieste',
      actions: [
        'Rivedere ed eliminare certificati medici vecchi o non necessari',
        'Archiviare documenti importanti su storage esterno',
        'Contattare l\'amministratore di sistema per opzioni di upgrade storage',
        'Monitorare l\'utilizzo storage regolarmente per prevenire problemi futuri'
      ],
      blockedUploads: 'I nuovi caricamenti sono attualmente bloccati',
      quickActions: 'Azioni Rapide',
      accessInstructions: 'Accedi alla sezione <strong>Gestione Documenti</strong> nel Pannello Admin per:',
      features: [
        'Visualizzare l\'utilizzo storage dettagliato',
        'Scaricare ed eliminare certificati medici',
        'Monitorare le tendenze storage'
      ],
      timestamp: 'Timestamp',
      footer: {
        title: 'OMNIA Holiday Tracker - Sistema Gestione Storage',
        copyright: '© 2025 OmniaServices. Tutti i diritti riservati.',
        automated: 'Questo è un avviso automatico dal sistema di gestione ferie.',
        administrator: 'Amministratore'
      },
      subjects: {
        critical: '🚨 CRITICO: Quota Storage Superata ({percentage}%) - OMNIA Holiday Tracker',
        warning: '⚠️ ATTENZIONE: Avviso Quota Storage ({percentage}%) - OMNIA Holiday Tracker',
        test: '🧪 OMNIA Holiday Tracker - Avviso Quota Storage Test'
      }
    },
    en: {
      alertTitle: 'Storage Quota Alert',
      testNotice: 'TEST EMAIL',
      testDescription: 'This is a test email to verify the storage quota alert system is working properly.',
      storageUsageAlert: 'Storage Usage Alert',
      alertDescription: {
        critical: '<strong>OMNIA Holiday Tracker</strong> storage usage has exceeded {percentage}% of the allocated quota.',
        warning: '<strong>OMNIA Holiday Tracker</strong> storage usage has reached {percentage}% of the allocated quota.',
        test: '<strong>OMNIA Holiday Tracker</strong> storage usage is at {percentage}% of the allocated quota.'
      },
      actionRequired: 'New file uploads are currently blocked to prevent service disruption.',
      warningMessage: 'Storage space is running low. Please review and clean up unnecessary files.',
      currentStorageStats: 'Current Storage Statistics',
      storageUsed: 'Storage Used',
      storageLimit: 'Storage Limit',
      totalFiles: 'Total Files',
      usagePercentage: 'Usage Percentage',
      immediateActions: 'Immediate Actions Required',
      actions: [
        'Review and delete old or unnecessary medical certificates',
        'Archive important documents to external storage',
        'Contact system administrator for storage upgrade options',
        'Monitor storage usage regularly to prevent future issues'
      ],
      blockedUploads: 'New uploads are currently blocked',
      quickActions: 'Quick Actions',
      accessInstructions: 'Access the <strong>Document Management</strong> section in the Admin Dashboard to:',
      features: [
        'View detailed storage usage',
        'Download and delete medical certificates',
        'Monitor storage trends'
      ],
      timestamp: 'Timestamp',
      footer: {
        title: 'OMNIA Holiday Tracker - Storage Management System',
        copyright: '© 2025 OmniaServices. All rights reserved.',
        automated: 'This is an automated alert from the holiday management system.',
        administrator: 'Administrator'
      },
      subjects: {
        critical: '🚨 CRITICAL: Storage Quota Exceeded ({percentage}%) - OMNIA Holiday Tracker',
        warning: '⚠️ WARNING: Storage Quota Alert ({percentage}%) - OMNIA Holiday Tracker',
        test: '🧪 OMNIA Holiday Tracker - Storage Quota Test Alert'
      }
    },
    es: {
      alertTitle: 'Alerta de Cuota de Almacenamiento',
      testNotice: 'EMAIL DE PRUEBA',
      testDescription: 'Este es un email de prueba para verificar que el sistema de alertas de cuota de almacenamiento funciona correctamente.',
      storageUsageAlert: 'Alerta de Uso de Almacenamiento',
      alertDescription: {
        critical: 'El uso de almacenamiento de <strong>OMNIA Holiday Tracker</strong> ha superado el {percentage}% de la cuota asignada.',
        warning: 'El uso de almacenamiento de <strong>OMNIA Holiday Tracker</strong> ha alcanzado el {percentage}% de la cuota asignada.',
        test: 'El uso de almacenamiento de <strong>OMNIA Holiday Tracker</strong> está en el {percentage}% de la cuota asignada.'
      },
      actionRequired: 'Las nuevas cargas de archivos están actualmente bloqueadas para prevenir interrupciones del servicio.',
      warningMessage: 'El espacio de almacenamiento se está agotando. Por favor revise y limpie archivos innecesarios.',
      currentStorageStats: 'Estadísticas Actuales de Almacenamiento',
      storageUsed: 'Almacenamiento Usado',
      storageLimit: 'Límite de Almacenamiento',
      totalFiles: 'Archivos Totales',
      usagePercentage: 'Porcentaje de Uso',
      immediateActions: 'Acciones Inmediatas Requeridas',
      actions: [
        'Revisar y eliminar certificados médicos antiguos o innecesarios',
        'Archivar documentos importantes en almacenamiento externo',
        'Contactar al administrador del sistema para opciones de actualización de almacenamiento',
        'Monitorear el uso de almacenamiento regularmente para prevenir problemas futuros'
      ],
      blockedUploads: 'Las nuevas cargas están actualmente bloqueadas',
      quickActions: 'Acciones Rápidas',
      accessInstructions: 'Accede a la sección <strong>Gestión de Documentos</strong> en el Panel de Administración para:',
      features: [
        'Ver uso detallado de almacenamiento',
        'Descargar y eliminar certificados médicos',
        'Monitorear tendencias de almacenamiento'
      ],
      timestamp: 'Marca de Tiempo',
      footer: {
        title: 'OMNIA Holiday Tracker - Sistema de Gestión de Almacenamiento',
        copyright: '© 2025 OmniaServices. Todos los derechos reservados.',
        automated: 'Esta es una alerta automática del sistema de gestión de vacaciones.',
        administrator: 'Administrador'
      },
      subjects: {
        critical: '🚨 CRÍTICO: Cuota de Almacenamiento Excedida ({percentage}%) - OMNIA Holiday Tracker',
        warning: '⚠️ ADVERTENCIA: Alerta de Cuota de Almacenamiento ({percentage}%) - OMNIA Holiday Tracker',
        test: '🧪 OMNIA Holiday Tracker - Alerta de Cuota de Almacenamiento de Prueba'
      }
    }
  };

  return translations[language as keyof typeof translations] || translations.it;
}

/**
 * Create storage quota alert email HTML (localized version)
 */
function createStorageQuotaAlertEmail(storageData: any, language: string = 'en', adminName: string = '') {
  const isTestAlert = storageData.usagePercentage < 80; // Test mode if usage is actually low
  const t = getStorageAlertTranslations(language);

  const alertLevel = storageData.isCritical ? 'CRITICAL' : storageData.isNearLimit ? 'WARNING' : 'TEST';
  const alertColor = storageData.isCritical ? '#dc2626' : storageData.isNearLimit ? '#f59e0b' : '#3b82f6';
  const alertIcon = storageData.isCritical ? '🚨' : storageData.isNearLimit ? '⚠️' : '🧪';

  // Get appropriate description based on alert level
  const alertDescription = storageData.isCritical ?
    t.alertDescription.critical :
    storageData.isNearLimit ?
      t.alertDescription.warning :
      t.alertDescription.test;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Storage Quota Alert - OMNIA Holiday Tracker</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: ${alertColor};
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .alert-level {
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 700;
            margin-top: 10px;
            display: inline-block;
          }
          .content {
            padding: 30px;
          }
          .alert-box {
            background: ${alertColor === '#dc2626' ? '#fef2f2' : alertColor === '#f59e0b' ? '#fffbeb' : '#eff6ff'};
            border-left: 4px solid ${alertColor};
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
          }
          .alert-box h2 {
            margin: 0 0 10px 0;
            color: ${alertColor};
            font-size: 18px;
            font-weight: 600;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 25px 0;
          }
          .stat-card {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .stat-label {
            font-size: 12px;
            font-weight: 500;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: #1e293b;
          }
          .progress-bar {
            width: 100%;
            height: 20px;
            background: #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            margin: 15px 0;
          }
          .progress-fill {
            height: 100%;
            background: ${alertColor};
            transition: width 0.3s ease;
            width: ${Math.min(storageData.usagePercentage, 100)}%;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding-right: 10px;
            color: white;
            font-size: 12px;
            font-weight: 600;
          }
          .action-required {
            background: #fef2f2;
            border: 1px solid #fecaca;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .action-required h3 {
            margin: 0 0 15px 0;
            color: #dc2626;
            font-size: 16px;
          }
          .action-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .action-list li {
            padding: 8px 0;
            border-bottom: 1px solid #fee2e2;
          }
          .action-list li:last-child {
            border-bottom: none;
          }
          .action-list li::before {
            content: "→";
            color: #dc2626;
            font-weight: bold;
            margin-right: 10px;
          }
          .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            color: #64748b;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            margin: 5px 0;
          }
          .footer a {
            color: #3b82f6;
            text-decoration: none;
          }
          ${isTestAlert ? `
          .test-notice {
            background: #dbeafe;
            border: 1px solid #93c5fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
          .test-notice strong {
            color: #1d4ed8;
          }
          ` : ''}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${alertIcon} ${t.alertTitle}</h1>
            <div class="alert-level">${alertLevel} ALERT</div>
          </div>

          <div class="content">
            ${isTestAlert ? `
            <div class="test-notice">
              <strong>🧪 ${t.testNotice}</strong><br>
              ${t.testDescription}
            </div>
            ` : ''}

            <div class="alert-box">
              <h2>${alertIcon} ${t.storageUsageAlert}</h2>
              <p>${alertDescription.replace('{percentage}', storageData.usagePercentage.toString())}</p>
              ${storageData.isCritical ?
                `<p><strong>⚠️ ${t.actionRequired}</strong></p>` :
                `<p><strong>${t.warningMessage}</strong></p>`
              }
            </div>

            <h3>📊 ${t.currentStorageStats}</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">${t.storageUsed}</div>
                <div class="stat-value">${storageData.formattedTotalSize}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">${t.storageLimit}</div>
                <div class="stat-value">${storageData.formattedLimit}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">${t.totalFiles}</div>
                <div class="stat-value">${storageData.totalFiles.toLocaleString()}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">${t.usagePercentage}</div>
                <div class="stat-value">${storageData.usagePercentage}%</div>
              </div>
            </div>

            <div class="progress-bar">
              <div class="progress-fill">
                ${storageData.usagePercentage}%
              </div>
            </div>

            ${storageData.isCritical || storageData.isNearLimit ? `
            <div class="action-required">
              <h3>🚨 ${t.immediateActions}</h3>
              <ul class="action-list">
                ${t.actions.map(action => `<li>${action}</li>`).join('')}
                ${storageData.isCritical ? `<li><strong>${t.blockedUploads}</strong></li>` : ''}
              </ul>
            </div>
            ` : ''}

            <h3>🔗 ${t.quickActions}</h3>
            <p>${t.accessInstructions}</p>
            <ul>
              ${t.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>

            <p><strong>${t.timestamp}:</strong> ${new Date().toLocaleString(language === 'it' ? 'it-IT' : language === 'es' ? 'es-ES' : 'en-US', {
              timeZone: 'Europe/Rome',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })} (CET)</p>
          </div>

          <div class="footer">
            <p><strong>${t.footer.title}</strong></p>
            <p>${t.footer.copyright}</p>
            <p>${t.footer.automated}</p>
            <p>${t.footer.administrator}: <a href="mailto:max.giurastante@omniaservices.net">max.giurastante@omniaservices.net</a></p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🚨 Storage Quota Alert Email - Starting process...');

    // Get current storage usage
    const storageUsage = await getCurrentStorageUsage();

    if (!storageUsage.success) {
      throw new Error(`Failed to get storage usage: ${storageUsage.error}`);
    }

    console.log('📊 Current storage stats:', {
      totalFiles: storageUsage.totalFiles,
      usagePercentage: storageUsage.usagePercentage,
      formattedSize: storageUsage.formattedTotalSize,
      isNearLimit: storageUsage.isNearLimit,
      isCritical: storageUsage.isCritical
    });

    // Get all active admin users
    const adminsResult = await getActiveAdmins();

    if (!adminsResult.success || adminsResult.admins.length === 0) {
      console.log('⚠️ No active admin users found, sending to fallback admin email');
      // Fallback to environment admin email if no admins in database
      const fallbackAdmin = {
        email: process.env.ADMIN_EMAIL || 'max.giurastante@omniaservices.net',
        name: 'Administrator',
        preferredLanguage: 'it'
      };
      adminsResult.admins = [fallbackAdmin];
    }

    console.log(`📋 Sending alerts to ${adminsResult.admins.length} admin(s)`);

    // Determine alert level
    let alertLevel = 'TEST';
    if (storageUsage.isCritical) {
      alertLevel = 'CRITICAL';
    } else if (storageUsage.isNearLimit) {
      alertLevel = 'WARNING';
    }

    const emailResults = [];

    // Send personalized email to each admin in their preferred language
    for (const admin of adminsResult.admins) {
      try {
        console.log(`📧 Sending ${alertLevel} alert to ${admin.name} (${admin.email}) in ${admin.preferredLanguage}`);

        // Get localized translations
        const t = getStorageAlertTranslations(admin.preferredLanguage);

        // Create localized subject
        let subject = t.subjects.test;
        if (storageUsage.isCritical) {
          subject = t.subjects.critical.replace('{percentage}', storageUsage.usagePercentage.toString());
        } else if (storageUsage.isNearLimit) {
          subject = t.subjects.warning.replace('{percentage}', storageUsage.usagePercentage.toString());
        }

        // Create localized email content
        const htmlContent = createStorageQuotaAlertEmail(storageUsage, admin.preferredLanguage, admin.name);

        // Send email
        const emailResult = await sendEmailViaService(admin.email, subject, htmlContent);

        if (emailResult.success) {
          console.log(`✅ Email sent successfully to ${admin.email}`);
          emailResults.push({
            admin: admin.email,
            language: admin.preferredLanguage,
            success: true,
            messageId: emailResult.data?.messageId
          });
        } else {
          console.error(`❌ Failed to send email to ${admin.email}:`, emailResult.error);
          emailResults.push({
            admin: admin.email,
            language: admin.preferredLanguage,
            success: false,
            error: emailResult.error
          });
        }
      } catch (adminEmailError: any) {
        console.error(`❌ Error sending email to ${admin.email}:`, adminEmailError);
        emailResults.push({
          admin: admin.email,
          language: admin.preferredLanguage,
          success: false,
          error: adminEmailError.message
        });
      }
    }

    // Calculate success rate
    const successfulEmails = emailResults.filter(result => result.success).length;
    const totalEmails = emailResults.length;

    console.log(`📊 Email send summary: ${successfulEmails}/${totalEmails} successful`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: successfulEmails > 0,
        message: `${alertLevel} storage quota alerts sent to ${successfulEmails}/${totalEmails} admin(s)`,
        data: {
          alertLevel,
          storageUsage: {
            percentage: storageUsage.usagePercentage,
            totalFiles: storageUsage.totalFiles,
            formattedSize: storageUsage.formattedTotalSize,
            isNearLimit: storageUsage.isNearLimit,
            isCritical: storageUsage.isCritical
          },
          emailResults,
          adminCount: totalEmails,
          successfulEmails
        },
        timestamp: new Date().toISOString()
      })
    };

  } catch (error: any) {
    console.error('❌ Storage quota alert error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to send storage quota alert',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};