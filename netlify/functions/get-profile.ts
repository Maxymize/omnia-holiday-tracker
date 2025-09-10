import { Handler } from '@netlify/functions';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getUserById } from '../../lib/db/helpers';
import { db } from '../../lib/db/index';
import { users, departments } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';

// Input validation schemas
const getProfileSchema = z.object({
  // No input needed for GET profile
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve avere almeno 2 caratteri').max(100).optional(),
  email: z.string().email('Email non valida').optional(),
  phone: z.string().min(10, 'Numero di telefono deve avere almeno 10 cifre').max(20).optional().nullable(),
  departmentId: z.string().uuid('ID dipartimento non valido').optional().nullable(),
  avatarUrl: z.string().optional().nullable().refine((val) => !val || val === '' || z.string().url().safeParse(val).success, { message: 'URL avatar non valido' }),
  jobTitle: z.string().min(2, 'Mansione deve avere almeno 2 caratteri').max(100, 'Mansione non può superare 100 caratteri').optional().nullable(),
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


// Get user profile with department information
async function getProfile(userId: string) {
  // Get user with department information using a join
  const userWithDepartment = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      departmentId: users.departmentId,
      departmentName: departments.name,
      holidayAllowance: users.holidayAllowance,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      jobTitle: users.jobTitle,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.id, userId))
    .limit(1);

  const user = userWithDepartment[0];
  
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
    departmentName: user.departmentName,
    holidayAllowance: user.holidayAllowance,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    jobTitle: user.jobTitle,
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

  // Update email if provided (check for uniqueness)
  if (updateData.email && updateData.email !== user.email) {
    // Check if email is already in use
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, updateData.email))
      .limit(1);
    
    if (existingUser.length > 0) {
      throw new Error('Email già in uso da un altro utente');
    }
    
    updateFields.email = updateData.email;
  }

  // Update phone if provided
  if (updateData.phone !== undefined) {
    updateFields.phone = updateData.phone || null;
  }

  // Update avatar URL if provided
  if (updateData.avatarUrl !== undefined) {
    updateFields.avatarUrl = updateData.avatarUrl || null;
  }

  // Update job title if provided
  if (updateData.jobTitle !== undefined) {
    updateFields.jobTitle = updateData.jobTitle || null;
  }

  // Update department if provided
  if (updateData.departmentId !== undefined) {
    updateFields.departmentId = updateData.departmentId || null;
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

  // Get updated user with department info
  const updatedProfile = await getProfile(userId);
  return updatedProfile;
}

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Verify token for all operations
    const userToken = await verifyAuthFromRequest(event);
    requireAccessToken(userToken);

    // Handle GET request - Get profile
    if (event.httpMethod === 'GET') {
      const profile = await getProfile(userToken.userId);

      // Log profile access for audit trail
      console.log(`🖼️ Profile accessed: ${userToken.email} avatarUrl:`, profile.avatarUrl);
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
      console.log('🔍 Profile update received data:', JSON.stringify(body, null, 2));
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

      // Return updated profile (with complete data including department info)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Profilo aggiornato con successo',
          user: updatedUser
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