import { Handler } from '@netlify/functions';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';
import { getUserByEmail } from '../../lib/db/operations';
import { createAuditLog } from '../../lib/db/helpers';
import { db } from '../../lib/db/index';
import { users, settings } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  console.log('APPLY-DEFAULT-ALLOWANCE: Function started');
  
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
    const userToken = await verifyAuthFromRequest(event);
    requireAccessToken(userToken);

    // Check admin permissions
    if (userToken.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Solo gli amministratori possono applicare i giorni predefiniti' })
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

    // Get the current default holiday allowance setting
    const allowanceSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'system.default_holiday_allowance'))
      .limit(1);
    
    if (allowanceSetting.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Impostazione giorni predefiniti non trovata' })
      };
    }

    const defaultAllowance = parseInt(allowanceSetting[0].value);
    if (isNaN(defaultAllowance)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valore giorni predefiniti non valido' })
      };
    }

    console.log('🔧 Applying default allowance:', defaultAllowance, 'to all users');

    // Get all users (both admin and employee)
    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.status, 'active'));

    let updatedCount = 0;
    const updates = [];

    // Update each user's holiday allowance
    for (const user of allUsers) {
      if (user.holidayAllowance !== defaultAllowance) {
        const previousAllowance = user.holidayAllowance;
        
        // Update the user
        await db
          .update(users)
          .set({ 
            holidayAllowance: defaultAllowance,
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id));

        // Create audit log
        const ipAddress = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
        const userAgent = event.headers['user-agent'] || 'unknown';
        
        await createAuditLog(
          'user_updated',
          adminUser.id,
          {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            previousAllowance,
            newAllowance: defaultAllowance,
            reason: 'Applicazione automatica giorni predefiniti del sistema'
          },
          user.id,
          user.id,
          'user',
          ipAddress,
          userAgent
        );

        updates.push({
          id: user.id,
          name: user.name,
          email: user.email,
          previousAllowance,
          newAllowance: defaultAllowance
        });

        updatedCount++;
        
        console.log(`Updated user ${user.name} (${user.email}): ${previousAllowance} → ${defaultAllowance}`);
      }
    }

    console.log(`Applied default allowance to ${updatedCount} users`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Giorni predefiniti applicati con successo a ${updatedCount} dipendenti`,
        data: {
          defaultAllowance,
          updatedCount,
          totalUsers: allUsers.length,
          updates,
          appliedBy: adminUser.email,
          appliedAt: new Date().toISOString()
        }
      })
    };

  } catch (error: any) {
    console.error('APPLY-DEFAULT-ALLOWANCE Error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore interno del server',
        debug: {
          message: error?.message,
          type: error?.constructor?.name,
          timestamp: new Date().toISOString()
        }
      })
    };
  }
};