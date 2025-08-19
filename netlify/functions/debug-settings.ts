import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
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

  try {
    // Verify authentication
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Check admin permissions
    if (userToken.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Solo gli amministratori possono vedere le impostazioni di sistema' })
      };
    }

    console.log('=== DEBUG SETTINGS ===');
    console.log('Event body:', event.body);
    console.log('Request headers:', event.headers);

    // Get current domain restriction setting
    const domainSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'system.domain_restriction_enabled'))
      .limit(1);

    console.log('Current domain restriction setting:', domainSetting);

    // Get all system settings
    const allSystemSettings = await db
      .select()
      .from(settings)
      .where(
        eq(settings.key, 'system.registration_enabled')
        .or(eq(settings.key, 'system.domain_restriction_enabled'))
        .or(eq(settings.key, 'system.default_holiday_allowance'))
      );

    console.log('All system settings:', allSystemSettings);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          domainSetting: domainSetting[0] || null,
          allSystemSettings,
          request: {
            body: event.body,
            timestamp: new Date().toISOString()
          }
        }
      })
    };

  } catch (error) {
    console.error('Debug settings error:', error);
    
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