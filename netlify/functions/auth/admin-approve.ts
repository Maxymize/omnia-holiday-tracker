import { Handler } from '@netlify/functions';
import { z, ZodError } from 'zod';
import { getUserById, updateUserStatus } from '../../../lib/db/helpers';
import { verifyAuthHeader, requireAccessToken, requireAdmin } from '../../../lib/auth/jwt-utils';

// Input validation schema
const approveSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional() // Optional rejection reason
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
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Verify admin token
    const adminToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(adminToken);
    requireAdmin(adminToken);
    
    // Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const validatedData = approveSchema.parse(body);

    // Get user to be approved/rejected
    const targetUser = await getUserById(validatedData.userId);
    if (!targetUser) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Utente non trovato' })
      };
    }

    // Check if user is in pending status
    if (targetUser.status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Utente già ${targetUser.status}. Solo utenti in attesa possono essere approvati/rifiutati.`
        })
      };
    }

    // Prevent admin from approving themselves (safety check)
    if (targetUser.id === adminToken.userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Non puoi approvare/rifiutare il tuo stesso account' })
      };
    }

    // Update user status based on action
    const newStatus = validatedData.action === 'approve' ? 'active' : 'inactive';
    const updatedUser = await updateUserStatus(validatedData.userId, newStatus);

    // Log admin action for audit trail
    const actionLog = {
      timestamp: new Date().toISOString(),
      adminId: adminToken.userId,
      adminEmail: adminToken.email,
      action: validatedData.action,
      targetUserId: validatedData.userId,
      targetUserEmail: targetUser.email,
      reason: validatedData.reason || null
    };
    
    console.log('Admin approval action:', JSON.stringify(actionLog));

    // Prepare response message
    const message = validatedData.action === 'approve' 
      ? `Utente ${targetUser.name} (${targetUser.email}) approvato con successo`
      : `Utente ${targetUser.name} (${targetUser.email}) rifiutato`;

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message,
        action: validatedData.action,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          status: updatedUser.status,
          updatedAt: updatedUser.updatedAt
        }
      })
    };

  } catch (error) {
    console.error('Admin approval error:', error);

    // Handle authentication errors
    if (error instanceof Error) {
      if (error.message.includes('Token') || error.message.includes('Accesso negato')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: error.message })
        };
      }
    }

    // Handle validation errors
    if (error instanceof ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Dati non validi', 
          details: error.issues?.map(e => e.message) || [error.message]
        })
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