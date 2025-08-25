import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { getUserByEmail } from '../../lib/db/operations';
import { db } from '../../lib/db/index';
import { users } from '../../lib/db/schema';
import { z } from 'zod';

// Input validation schema
const applyAllowancesSchema = z.object({
  vacationAllowance: z.number().min(1).max(365),
  personalAllowance: z.number().min(1).max(365),
  sickAllowance: z.number().min(-1).max(365) // -1 for unlimited
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
        body: JSON.stringify({ error: 'Solo gli amministratori possono applicare impostazioni a tutti i dipendenti' })
      };
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = applyAllowancesSchema.parse(body);

    // Get admin user details
    const adminUser = await getUserByEmail(userToken.email);
    if (!adminUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Amministratore non trovato nel database' })
      };
    }

    // Update all users' holiday allowances
    // Note: We keep the existing users.holidayAllowance field for backward compatibility
    // The new flexible system uses system settings, but we update the legacy field too
    const updateResult = await db
      .update(users)
      .set({
        holidayAllowance: validatedData.vacationAllowance,
        // Note: Personal and sick allowances are now managed through system settings
        // The individual user record primarily tracks the vacation allowance for compatibility
        updatedAt: new Date()
      })
      .returning({ id: users.id, email: users.email });

    console.log('Applied allowances to all employees:', {
      vacationAllowance: validatedData.vacationAllowance,
      personalAllowance: validatedData.personalAllowance,
      sickAllowance: validatedData.sickAllowance,
      updatedEmployees: updateResult.length,
      appliedBy: userToken.email,
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Impostazioni applicate con successo a ${updateResult.length} dipendenti`,
        updatedEmployees: updateResult.length,
        data: {
          vacationAllowance: validatedData.vacationAllowance,
          personalAllowance: validatedData.personalAllowance,
          sickAllowance: validatedData.sickAllowance,
          appliedAt: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Apply allowances to all employees error:', error);

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

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server' })
    };
  }
};