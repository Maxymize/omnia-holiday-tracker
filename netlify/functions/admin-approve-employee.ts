import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { updateEmployeeStatusWithAudit, getUserByEmail } from '../../lib/db/operations';
import { z } from 'zod';

// Input validation schema
const approveEmployeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional()
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
        body: JSON.stringify({ error: 'Solo gli amministratori possono approvare o rifiutare dipendenti' })
      };
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = approveEmployeeSchema.parse(body);

    const { employeeId, action, reason } = validatedData;
    
    // Get admin user details
    const adminUser = await getUserByEmail(userToken.email);
    if (!adminUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Amministratore non trovato nel database' })
      };
    }
    
    // Update employee status in database with audit logging
    const newStatus = action === 'approve' ? 'active' : 'inactive';
    const ipAddress = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';
    
    await updateEmployeeStatusWithAudit(
      employeeId,
      newStatus,
      adminUser.id,
      reason,
      ipAddress,
      userAgent
    );
    
    console.log('Employee approval action completed:', {
      employeeId,
      action,
      newStatus,
      adminEmail: userToken.email,
      reason: reason || 'No reason provided',
      timestamp: new Date().toISOString()
    });

    // Response with action result
    const actionResult = {
      employeeId,
      action,
      status: newStatus,
      processedBy: userToken.email,
      processedAt: new Date().toISOString(),
      reason
    };

    const message = action === 'approve' 
      ? `Dipendente approvato con successo` 
      : `Dipendente rifiutato`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message,
        data: actionResult
      })
    };

  } catch (error) {
    console.error('Employee approval error:', error);

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