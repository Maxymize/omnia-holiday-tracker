import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';

// Mock system settings for development
const mockSettings = {
  // Visibility settings
  'holidays.visibility_mode': 'all_see_all',
  'holidays.show_names': 'true',
  'holidays.show_details': 'false',
  
  // Approval settings
  'holidays.approval_mode': 'manual',
  'holidays.advance_notice_days': '14',
  'holidays.max_consecutive_days': '30',
  
  // System settings
  'system.registration_enabled': 'true',
  'system.default_holiday_allowance': '25',
  
  // Notification settings
  'notifications.email_enabled': 'false',
  'notifications.browser_enabled': 'true',
  'notifications.remind_managers': 'true',
  
  // Department settings
  'departments.visibility_enabled': 'true',
  'departments.cross_department_view': 'false',
  
  // Company settings
  'company.name': 'OmniaGroup',
  'company.time_zone': 'Europe/Rome',
  'company.work_days': 'monday,tuesday,wednesday,thursday,friday'
};

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

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
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

    console.log('Mock settings accessed by:', userToken.email);

    // Return mock settings data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        settings: mockSettings,
        meta: {
          totalSettings: Object.keys(mockSettings).length,
          userRole: userToken.role,
          canModify: userToken.role === 'admin',
          lastAccessed: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Get settings mock error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
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