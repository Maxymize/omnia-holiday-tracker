import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { getUserByEmail } from '../../lib/db/operations';
import { db } from '../../lib/db/index';
import { settings } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

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

    // Get admin user details
    const adminUser = await getUserByEmail(userToken.email);
    if (!adminUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Amministratore non trovato nel database' })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { key, value } = body;

    console.log('Simple settings update:', { key, value, type: typeof value, adminUser: adminUser.email });

    if (!key || value === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Chiave e valore sono richiesti' })
      };
    }

    // Valid keys
    const validKeys = [
      'company.name',
      'holidays.visibility_mode',
      'holidays.approval_mode', 
      'holidays.show_names',
      'holidays.show_details',
      'holidays.advance_notice_days',
      'holidays.max_consecutive_days',
      'system.registration_enabled',
      'system.domain_restriction_enabled',
      'system.default_holiday_allowance',
      'notifications.email_enabled',
      'notifications.browser_enabled',
      'notifications.remind_managers',
      'departments.visibility_enabled',
      'departments.cross_department_view'
    ];

    if (!validKeys.includes(key)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Chiave non valida: ${key}` })
      };
    }

    // Convert value to string for database storage
    const stringValue = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);

    console.log('Saving to database:', { key, originalValue: value, stringValue });

    // Check if setting exists
    const existing = await db.select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    let result;
    if (existing.length > 0) {
      console.log('Updating existing setting...');
      result = await db.update(settings)
        .set({ 
          value: stringValue, 
          updatedBy: adminUser.id, 
          updatedAt: new Date() 
        })
        .where(eq(settings.key, key))
        .returning();
    } else {
      console.log('Creating new setting...');
      result = await db.insert(settings)
        .values({
          key,
          value: stringValue,
          description: `System setting for ${key}`,
          updatedBy: adminUser.id
        })
        .returning();
    }

    console.log('Database operation successful:', result[0]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          setting: result[0]
        }
      })
    };

  } catch (error) {
    console.error('Simple settings update error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};