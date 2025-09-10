import { Handler } from '@netlify/functions';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';
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

  // Allow GET for testing
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Test function is ready. Call with admin authorization header to test settings save.' 
      })
    };
  }

  try {
    // Verify authentication
    const userToken = await verifyAuthFromRequest(event);
    requireAccessToken(userToken);

    // Check admin permissions
    if (userToken.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Solo gli amministratori possono modificare le impostazioni di sistema' })
      };
    }

    console.log('=== TEST SETTINGS SAVE ===');
    console.log('User token:', { email: userToken.email, role: userToken.role });

    // Get admin user details
    const adminUser = await getUserByEmail(userToken.email);
    if (!adminUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Amministratore non trovato nel database' })
      };
    }

    console.log('Admin user found:', { id: adminUser.id, email: adminUser.email });

    // Test: Try to save domain restriction setting
    const testKey = 'system.domain_restriction_enabled';
    const testValue = 'false';

    console.log(`Testing save of ${testKey} = ${testValue}`);

    // Check if setting exists
    const existing = await db.select()
      .from(settings)
      .where(eq(settings.key, testKey))
      .limit(1);

    console.log('Existing setting:', existing);

    let result;
    if (existing.length > 0) {
      console.log('Updating existing setting...');
      result = await db.update(settings)
        .set({ 
          value: testValue, 
          updatedBy: adminUser.id, 
          updatedAt: new Date() 
        })
        .where(eq(settings.key, testKey))
        .returning();
      console.log('Update result:', result);
    } else {
      console.log('Creating new setting...');
      result = await db.insert(settings)
        .values({
          key: testKey,
          value: testValue,
          description: 'Test domain restriction setting',
          updatedBy: adminUser.id
        })
        .returning();
      console.log('Insert result:', result);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Test save completed',
        data: {
          setting: result[0],
          adminUser: { id: adminUser.id, email: adminUser.email }
        }
      })
    };

  } catch (error) {
    console.error('Test settings save error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
};