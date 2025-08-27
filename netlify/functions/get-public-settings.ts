import { Handler } from '@netlify/functions';
import { db } from '../../lib/db/index';
import { settings } from '../../lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

// Public settings that can be accessed without authentication
const PUBLIC_SETTINGS = [
  'company.name'
];

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    console.log('🔧 Public settings request - no authentication required');

    // Get only public settings from database
    const publicSettings = await db
      .select({
        key: settings.key,
        value: settings.value
      })
      .from(settings)
      .where(inArray(settings.key, PUBLIC_SETTINGS));

    console.log('📋 Public settings retrieved:', publicSettings);

    // Transform to key-value object
    const settingsObj = publicSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    // Add default values for missing settings
    if (!settingsObj['company.name']) {
      settingsObj['company.name'] = 'OmniaGroup';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        settings: settingsObj
      })
    };

  } catch (error) {
    console.error('Public settings error:', error);
    
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