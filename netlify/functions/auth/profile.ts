import { Handler } from '@netlify/functions';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getUserById } from '../../../lib/db/helpers';
import { db } from '../../../lib/db/index';
import { users } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuthHeader, requireAccessToken } from '../../../lib/auth/jwt-utils';

// Input validation schemas
const getProfileSchema = z.object({
  // No input needed for GET profile
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve avere almeno 2 caratteri').max(100).optional(),
  currentPassword: z.string().min(1, 'Password attuale richiesta').optional(),
  newPassword: z.string().min(8, 'Nuova password deve avere almeno 8 caratteri').optional(),
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Content-Type': 'application/json'
};


// Get user profile
async function getProfile(userId: string) {
  const user = await getUserById(userId);
  
  if (!user) {
    throw new Error('Utente non trovato');
  }

  // Return user data without sensitive information
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    departmentId: user.departmentId,
    holidayAllowance: user.holidayAllowance,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

// Update user profile
async function updateProfile(userId: string, updateData: any) {
  const user = await getUserById(userId);
  
  if (!user) {
    throw new Error('Utente non trovato');
  }

  const updateFields: any = {
    updatedAt: new Date()
  };

  // Update name if provided
  if (updateData.name) {
    updateFields.name = updateData.name;
  }

  // Update password if provided
  if (updateData.newPassword && updateData.currentPassword) {
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(updateData.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Password attuale non corretta');
    }

    // Hash new password
    const saltRounds = 12;
    updateFields.passwordHash = await bcrypt.hash(updateData.newPassword, saltRounds);
  }

  // Only proceed if there are fields to update
  if (Object.keys(updateFields).length === 1) { // Only updatedAt
    throw new Error('Nessun campo da aggiornare');
  }

  // Update user in database
  const result = await db
    .update(users)
    .set(updateFields)
    .where(eq(users.id, userId))
    .returning();

  if (!result[0]) {
    throw new Error('Errore durante l\'aggiornamento del profilo');
  }

  return result[0];
}

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Verify token for all operations
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Handle GET request - Get profile
    if (event.httpMethod === 'GET') {
      const profile = await getProfile(userToken.userId);

      // Log profile access for audit trail
      console.log(`Profile accessed: ${userToken.email} at ${new Date().toISOString()}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          user: profile
        })
      };
    }

    // Handle PUT request - Update profile
    if (event.httpMethod === 'PUT') {
      // Parse and validate input
      const body = JSON.parse(event.body || '{}');
      const validatedData = updateProfileSchema.parse(body);

      // Check if password change is requested but current password is missing
      if (validatedData.newPassword && !validatedData.currentPassword) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Password attuale richiesta per cambio password' })
        };
      }

      // Update profile
      const updatedUser = await updateProfile(userToken.userId, validatedData);

      // Log profile update for audit trail
      const updateLog = {
        timestamp: new Date().toISOString(),
        userId: userToken.userId,
        email: userToken.email,
        fieldsUpdated: Object.keys(validatedData),
        passwordChanged: !!validatedData.newPassword
      };
      console.log('Profile updated:', JSON.stringify(updateLog));

      // Return updated profile (without sensitive data)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Profilo aggiornato con successo',
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            status: updatedUser.status,
            departmentId: updatedUser.departmentId,
            holidayAllowance: updatedUser.holidayAllowance,
            updatedAt: updatedUser.updatedAt
          }
        })
      };
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };

  } catch (error) {
    console.error('Profile operation error:', error);

    // Handle authentication errors
    if (error instanceof Error) {
      if (error.message.includes('Token') || error.message.includes('non trovato')) {
        const statusCode = error.message.includes('Token') ? 401 : 404;
        return {
          statusCode,
          headers,
          body: JSON.stringify({ error: error.message })
        };
      }

      // Handle business logic errors
      if (error.message.includes('Password attuale') || error.message.includes('Nessun campo')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: error.message })
        };
      }
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
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