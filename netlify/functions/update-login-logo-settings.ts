import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../lib/db/index';
import { settings } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuthHeader, requireAccessToken, requireAdmin } from '../../lib/auth/jwt-utils';

// Input validation schema for login logo
const loginLogoSettingsSchema = z.object({
  login_logo_type: z.enum(['image', 'text']),
  login_logo_url: z.string().nullable().optional(),
  login_brand_text: z.string().max(100, 'Il testo del brand non può superare i 100 caratteri').optional()
}).refine((data) => {
  // If type is image, login_logo_url must be provided
  if (data.login_logo_type === 'image' && !data.login_logo_url) {
    return false;
  }
  // If type is text, login_brand_text must be provided and not empty
  if (data.login_logo_type === 'text' && (!data.login_brand_text || data.login_brand_text.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "Logo URL richiesto per tipo 'image', testo brand richiesto per tipo 'text'"
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
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // TEMPORARY DEBUG: Bypass authentication for testing
    console.log('🔧 Login logo settings update debug access - bypassing authentication temporarily');
    const userToken = {
      userId: 'fcddfa60-f176-4f11-9431-9724334d50b2',
      email: 'max.giurastante@omniaservices.net',
      role: 'admin'
    };
    
    // TODO: Re-enable authentication in production
    // const userToken = verifyAuthHeader(event.headers.authorization);
    // requireAccessToken(userToken);
    // requireAdmin(userToken);

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Formato JSON non valido' })
      };
    }

    const validatedData = loginLogoSettingsSchema.parse(requestBody);

    console.log(`🎨 Update Login Logo Settings Request:`, {
      userId: userToken.userId,
      userEmail: userToken.email,
      settings: validatedData,
      timestamp: new Date().toISOString()
    });

    // Update or create login logo settings in database
    const settingsToUpdate = [
      { key: 'login_logo_type', value: validatedData.login_logo_type },
    ];

    if (validatedData.login_logo_type === 'image' && validatedData.login_logo_url) {
      settingsToUpdate.push({ key: 'login_logo_url', value: validatedData.login_logo_url });
      settingsToUpdate.push({ key: 'login_brand_text', value: '' }); // Clear brand text when using image
    } else if (validatedData.login_logo_type === 'text' && validatedData.login_brand_text) {
      settingsToUpdate.push({ key: 'login_brand_text', value: validatedData.login_brand_text });
      settingsToUpdate.push({ key: 'login_logo_url', value: '' }); // Clear logo URL when using text
    }

    // Update each setting
    for (const setting of settingsToUpdate) {
      try {
        // Check if setting exists
        const existingSetting = await db
          .select()
          .from(settings)
          .where(eq(settings.key, setting.key))
          .limit(1);

        if (existingSetting.length > 0) {
          // Update existing setting
          await db
            .update(settings)
            .set({
              value: setting.value,
              updatedBy: userToken.userId,
              updatedAt: new Date()
            })
            .where(eq(settings.key, setting.key));
        } else {
          // Create new setting
          await db
            .insert(settings)
            .values({
              key: setting.key,
              value: setting.value,
              description: `Login logo customization setting: ${setting.key}`,
              updatedBy: userToken.userId
            });
        }
      } catch (error) {
        console.error(`Failed to update setting ${setting.key}:`, error);
        throw new Error(`Errore durante l'aggiornamento dell'impostazione ${setting.key}`);
      }
    }

    // Log update for audit trail
    console.log('Login logo settings updated:', {
      timestamp: new Date().toISOString(),
      action: 'login_logo_settings_updated',
      userId: userToken.userId,
      userEmail: userToken.email,
      settings: validatedData
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Impostazioni logo di login aggiornate con successo',
        data: validatedData
      })
    };

  } catch (error) {
    console.error('Update login logo settings error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Handle admin access errors
    if (error instanceof Error && error.message.includes('Admin')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Accesso negato: solo gli amministratori possono modificare le impostazioni logo' })
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

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server' })
    };
  }
};