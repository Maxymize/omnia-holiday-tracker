import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { db } from '../../lib/db/index';
import { settings } from '../../lib/db/schema';
import { eq, or } from 'drizzle-orm';

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    console.log('=== DEBUG DOMAIN SETTING ===');

    // Get domain restriction setting from database
    const domainSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'system.domain_restriction_enabled'))
      .limit(1);

    console.log('Domain restriction setting from DB:', domainSetting);

    // Get ALL system settings
    const allSystemSettings = await db
      .select()
      .from(settings)
      .where(
        or(
          eq(settings.key, 'system.registration_enabled'),
          eq(settings.key, 'system.domain_restriction_enabled'),
          eq(settings.key, 'system.default_holiday_allowance')
        )
      );

    console.log('All system settings from DB:', allSystemSettings);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          domainSetting: domainSetting[0] || null,
          allSystemSettings,
          debugInfo: {
            domainSettingExists: domainSetting.length > 0,
            domainSettingValue: domainSetting[0]?.value,
            domainSettingType: typeof domainSetting[0]?.value,
            timestamp: new Date().toISOString()
          }
        }
      })
    };

  } catch (error) {
    console.error('Debug domain setting error:', error);
    
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