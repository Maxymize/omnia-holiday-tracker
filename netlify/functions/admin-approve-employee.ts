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
  console.log('DEBUG: admin-approve-employee function started');
  console.log('DEBUG: HTTP method:', event.httpMethod);
  console.log('DEBUG: Headers received:', JSON.stringify(event.headers, null, 2));
  console.log('DEBUG: Body received:', event.body);

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
    console.log('DEBUG: Starting authentication verification');
    
    // Verify authentication
    const userToken = verifyAuthHeader(event.headers.authorization);
    console.log('DEBUG: User token extracted:', {
      email: userToken?.email,
      role: userToken?.role,
      hasToken: !!userToken
    });
    
    requireAccessToken(userToken);
    console.log('DEBUG: Access token validation passed');

    // Check admin permissions
    if (userToken.role !== 'admin') {
      console.log('DEBUG: User role check failed - not admin:', userToken.role);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Solo gli amministratori possono approvare o rifiutare dipendenti' })
      };
    }
    console.log('DEBUG: Admin role verified');

    // Parse and validate request body
    console.log('DEBUG: Parsing request body');
    const body = JSON.parse(event.body || '{}');
    console.log('DEBUG: Parsed body:', body);
    
    const validatedData = approveEmployeeSchema.parse(body);
    console.log('DEBUG: Data validation passed:', validatedData);

    const { employeeId, action, reason } = validatedData;
    console.log('DEBUG: Extracted data:', { employeeId, action, reason });
    
    // Get admin user details
    console.log('DEBUG: Getting admin user details for email:', userToken.email);
    const adminUser = await getUserByEmail(userToken.email);
    console.log('DEBUG: Admin user retrieved:', {
      found: !!adminUser,
      id: adminUser?.id,
      email: adminUser?.email
    });
    
    if (!adminUser) {
      console.log('DEBUG: Admin user not found in database');
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
    
    console.log('DEBUG: Preparing to update employee status:', {
      employeeId,
      newStatus,
      adminUserId: adminUser.id,
      reason,
      ipAddress,
      userAgent
    });
    
    await updateEmployeeStatusWithAudit(
      employeeId,
      newStatus,
      adminUser.id,
      reason,
      ipAddress,
      userAgent
    );
    
    console.log('DEBUG: Employee status update completed successfully');
    
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

    console.log('DEBUG: Returning success response');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message,
        data: actionResult
      })
    };

  } catch (error: any) {
    console.error('DEBUG: Employee approval error occurred');
    console.error('DEBUG: Error type:', error?.constructor?.name);
    console.error('DEBUG: Error message:', error?.message);
    console.error('DEBUG: Error stack:', error?.stack);
    console.error('DEBUG: Full error object:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.log('DEBUG: Zod validation error detected');
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
      console.log('DEBUG: Token/authentication error detected');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Generic error response with more details in debug mode
    console.log('DEBUG: Returning generic 500 error');
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