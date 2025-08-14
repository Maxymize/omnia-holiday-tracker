import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { saveToMockStorage } from '../../lib/mock-storage';
import { z } from 'zod';

// Valid setting keys and their types
const systemSettingSchema = z.object({
  settings: z.record(z.string(), z.any()).refine((settings) => {
    // Validate that all keys are valid system setting keys
    const validKeys = [
      'holidays.visibility_mode',
      'holidays.approval_mode', 
      'holidays.show_names',
      'holidays.show_details',
      'holidays.advance_notice_days',
      'holidays.max_consecutive_days',
      'system.registration_enabled',
      'system.default_holiday_allowance',
      'notifications.email_enabled',
      'notifications.browser_enabled',
      'notifications.remind_managers',
      'departments.visibility_enabled',
      'departments.cross_department_view'
    ];
    
    return Object.keys(settings).every(key => validKeys.includes(key));
  }, {
    message: 'Una o più chiavi di impostazione non sono valide'
  })
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify authentication
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Check admin permissions
    if (userToken.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Solo gli amministratori possono modificare le impostazioni di sistema' })
      };
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = systemSettingSchema.parse(body);

    // For now, simulate settings update
    // In a real implementation, this would:
    // 1. Update settings in database
    // 2. Validate setting values based on type
    // 3. Apply immediate effects (like visibility changes)
    // 4. Log setting changes for audit trail

    const { settings } = validatedData;
    
    console.log('System settings update (mock):', {
      settings,
      updatedBy: userToken.email,
      timestamp: new Date().toISOString()
    });

    // Mock validation for specific settings
    const validatedSettings: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(settings)) {
      switch (key) {
        case 'holidays.visibility_mode':
          if (!['all_see_all', 'admin_only', 'department_only'].includes(value)) {
            throw new Error(`Valore non valido per ${key}: ${value}`);
          }
          validatedSettings[key] = value;
          break;
          
        case 'holidays.approval_mode':
          if (!['manual', 'auto'].includes(value)) {
            throw new Error(`Valore non valido per ${key}: ${value}`);
          }
          validatedSettings[key] = value;
          break;
          
        case 'holidays.advance_notice_days':
        case 'holidays.max_consecutive_days':
        case 'system.default_holiday_allowance':
          const numValue = parseInt(value);
          if (isNaN(numValue) || numValue < 0) {
            throw new Error(`Valore numerico non valido per ${key}: ${value}`);
          }
          validatedSettings[key] = numValue;
          break;
          
        case 'holidays.show_names':
        case 'holidays.show_details':
        case 'system.registration_enabled':
        case 'notifications.email_enabled':
        case 'notifications.browser_enabled':
        case 'notifications.remind_managers':
        case 'departments.visibility_enabled':
        case 'departments.cross_department_view':
          validatedSettings[key] = Boolean(value);
          break;
          
        default:
          validatedSettings[key] = value;
      }
    }

    // Save updated settings to mock storage
    const updateResult = {
      settings: validatedSettings,
      updatedBy: userToken.email,
      updatedAt: new Date().toISOString(),
      affectedKeys: Object.keys(validatedSettings)
    };
    
    // Save to storage using the same key as get-holidays-mock.ts expects
    saveToMockStorage('system-settings', updateResult);
    
    console.log('Settings saved to storage:', updateResult);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${Object.keys(validatedSettings).length} impostazioni aggiornate con successo`,
        data: {
          updatedSettings: validatedSettings,
          updatedBy: userToken.email,
          updatedAt: updateResult.updatedAt,
          affectedKeys: Object.keys(validatedSettings)
        }
      })
    };

  } catch (error) {
    console.error('Update settings error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Dati non validi', 
          details: error.issues 
        })
      };
    }

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Handle custom validation errors
    if (error instanceof Error && error.message.includes('Valore non valido')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message })
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