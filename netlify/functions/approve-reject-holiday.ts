import { Handler } from '@netlify/functions';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';
import { updateHolidayStatusWithAudit, getUserByEmail } from '../../lib/db/operations';
import { z } from 'zod';

// Input validation schema
const approveRejectSchema = z.object({
  holidayId: z.string().min(1, 'Holiday ID is required'),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional()
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
    const userToken = await verifyAuthFromRequest(event);
    requireAccessToken(userToken);

    // Check admin permissions
    if (userToken.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Solo gli amministratori possono approvare o rifiutare le ferie' })
      };
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = approveRejectSchema.parse(body);

    // Get admin user details
    const adminUser = await getUserByEmail(userToken.email);
    if (!adminUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Amministratore non trovato nel database' })
      };
    }

    // Update holiday status in database with audit logging
    const status = validatedData.action === 'approve' ? 'approved' : 'rejected';
    const ipAddress = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';

    await updateHolidayStatusWithAudit(
      validatedData.holidayId,
      status,
      adminUser.id,
      validatedData.notes,
      ipAddress,
      userAgent
    );

    console.log('Holiday approval/rejection completed:', {
      holidayId: validatedData.holidayId,
      action: validatedData.action,
      approvedBy: userToken.email,
      timestamp: new Date().toISOString()
    });

    // Response with updated holiday status
    const updatedHoliday = {
      id: validatedData.holidayId,
      status: status,
      approvedBy: userToken.email,
      approvedAt: new Date().toISOString(),
      notes: validatedData.notes
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Richiesta ferie ${validatedData.action === 'approve' ? 'approvata' : 'rifiutata'} con successo`,
        data: updatedHoliday
      })
    };

  } catch (error) {
    console.error('Approve/reject holiday error:', error);

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