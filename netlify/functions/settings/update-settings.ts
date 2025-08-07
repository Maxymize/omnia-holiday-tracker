import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../../lib/db/index';
import { settings, users } from '../../../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuthHeader, requireAccessToken, requireAdmin } from '../../../lib/auth/jwt-utils';

// Input validation schema
const updateSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string().min(1, 'Chiave setting richiesta'),
    value: z.string().min(0, 'Valore setting richiesto'),
    description: z.string().optional()
  })).min(1, 'Almeno un setting da aggiornare richiesto')
});

// Define allowed setting keys and their validation
const settingValidations = {
  // Visibility settings
  'holidays.visibility_mode': z.enum(['all_employees', 'department_only', 'admin_only']),
  'holidays.show_names': z.enum(['true', 'false']),
  'holidays.show_details': z.enum(['true', 'false']),
  
  // Approval settings
  'holidays.approval_mode': z.enum(['auto', 'manual']),
  'holidays.auto_approve_days': z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 0 && n <= 365),
  'holidays.max_consecutive_days': z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 365),
  
  // Request settings
  'holidays.advance_notice_days': z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 0 && n <= 90),
  'holidays.max_future_months': z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 24),
  'holidays.allow_past_requests': z.enum(['true', 'false']),
  
  // Department settings
  'departments.visibility_enabled': z.enum(['true', 'false']),
  'departments.cross_department_view': z.enum(['true', 'false']),
  
  // Notification settings
  'notifications.email_enabled': z.enum(['true', 'false']),
  'notifications.browser_enabled': z.enum(['true', 'false']),
  'notifications.remind_managers': z.enum(['true', 'false']),
  
  // System settings
  'system.maintenance_mode': z.enum(['true', 'false']),
  'system.registration_enabled': z.enum(['true', 'false']),
  'system.default_holiday_allowance': z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 50),
  
  // Company settings
  'company.name': z.string().min(1).max(100),
  'company.time_zone': z.string().min(1),
  'company.work_days': z.string().regex(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(,(monday|tuesday|wednesday|thursday|friday|saturday|sunday))*$/)
};

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow PUT requests
  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Verify admin authentication
    const adminToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(adminToken);
    requireAdmin(adminToken);

    // Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const validatedData = updateSettingsSchema.parse(body);

    // Validate each setting individually
    const validationErrors: string[] = [];
    for (const setting of validatedData.settings) {
      const validator = settingValidations[setting.key as keyof typeof settingValidations];
      
      if (!validator) {
        validationErrors.push(`Setting key "${setting.key}" non riconosciuta`);
        continue;
      }

      try {
        validator.parse(setting.value);
      } catch (error) {
        if (error instanceof z.ZodError) {
          validationErrors.push(`Setting "${setting.key}": ${error.issues[0]?.message || 'valore non valido'}`);
        }
      }
    }

    if (validationErrors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Validazione settings fallita', 
          details: validationErrors
        })
      };
    }

    // Get admin information for audit log
    const adminData = await db
      .select({
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, adminToken.userId))
      .limit(1);

    // Process each setting update
    const updatedSettings = [];
    const auditChanges = [];

    for (const settingUpdate of validatedData.settings) {
      // Check if setting already exists
      const existingSetting = await db
        .select()
        .from(settings)
        .where(eq(settings.key, settingUpdate.key))
        .limit(1);

      let result;
      const currentTime = new Date();
      
      if (existingSetting[0]) {
        // Update existing setting
        const oldValue = existingSetting[0].value;
        
        result = await db
          .update(settings)
          .set({
            value: settingUpdate.value,
            description: settingUpdate.description || existingSetting[0].description,
            updatedBy: adminToken.userId,
            updatedAt: currentTime
          })
          .where(eq(settings.key, settingUpdate.key))
          .returning();

        // Track change for audit
        auditChanges.push({
          key: settingUpdate.key,
          action: 'updated',
          oldValue,
          newValue: settingUpdate.value,
          description: settingUpdate.description || existingSetting[0].description
        });

      } else {
        // Create new setting
        result = await db
          .insert(settings)
          .values({
            key: settingUpdate.key,
            value: settingUpdate.value,
            description: settingUpdate.description || `Impostazione ${settingUpdate.key}`,
            updatedBy: adminToken.userId,
            createdAt: currentTime,
            updatedAt: currentTime
          })
          .returning();

        // Track change for audit
        auditChanges.push({
          key: settingUpdate.key,
          action: 'created',
          oldValue: null,
          newValue: settingUpdate.value,
          description: settingUpdate.description || `Impostazione ${settingUpdate.key}`
        });
      }

      if (result[0]) {
        updatedSettings.push(result[0]);
      }
    }

    // Comprehensive audit logging
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: 'settings_updated',
      adminId: adminToken.userId,
      adminEmail: adminToken.email,
      adminName: adminData[0]?.name || 'Unknown',
      changes: auditChanges,
      totalChanges: auditChanges.length,
      changesSummary: auditChanges.map(c => `${c.key}: ${c.oldValue || 'null'} → ${c.newValue}`).join(', ')
    };
    
    console.log('Settings updated:', JSON.stringify(auditLog));

    // Check for critical system changes and log warnings
    const criticalChanges = auditChanges.filter(change => 
      change.key.startsWith('system.') || 
      change.key === 'holidays.approval_mode' ||
      change.key === 'holidays.visibility_mode'
    );

    if (criticalChanges.length > 0) {
      console.warn('Critical system settings changed:', JSON.stringify({
        adminEmail: adminToken.email,
        criticalChanges: criticalChanges.map(c => ({ key: c.key, newValue: c.newValue }))
      }));
    }

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${updatedSettings.length} impostazioni aggiornate con successo`,
        updatedSettings: updatedSettings.map(setting => ({
          key: setting.key,
          value: setting.value,
          description: setting.description,
          updatedAt: setting.updatedAt
        })),
        audit: {
          totalChanges: auditChanges.length,
          changes: auditChanges,
          updatedBy: {
            id: adminToken.userId,
            email: adminToken.email,
            name: adminData[0]?.name || 'Unknown'
          },
          timestamp: new Date().toISOString()
        },
        warnings: criticalChanges.length > 0 ? [
          'Sono state modificate impostazioni di sistema critiche. Verifica che il comportamento dell\'applicazione sia quello desiderato.'
        ] : []
      })
    };

  } catch (error) {
    console.error('Update settings error:', error);

    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('Token') || error.message.includes('Accesso negato'))) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Dati non validi', 
          details: error.issues?.map(e => `${e.path.join('.')}: ${e.message}`)
        })
      };
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Formato JSON non valido' })
      };
    }

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server' })
    };
  }
};