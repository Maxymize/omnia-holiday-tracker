import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Clear auth cookies by setting them with past expiration
    const cookieOptions = 'HttpOnly; SameSite=Strict; Path=/; Max-Age=0';
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': [
          `auth-token=; ${cookieOptions}`,
          `refresh-token=; ${cookieOptions}`
        ]
      },
      body: JSON.stringify({
        success: true,
        message: 'Logout successful'
      })
    };

  } catch (error) {
    console.error('Logout error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server' })
    };
  }
};