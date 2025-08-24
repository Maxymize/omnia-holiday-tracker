import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../lib/db/index';
import { users } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';

// Request body validation schema
const updateRoleSchema = z.object({
  employeeId: z.string().uuid(),
  role: z.enum(['admin', 'employee']),
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
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Verify authentication - only admins can update roles
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Get current user information to verify admin privileges
    const currentUser = await db
      .select({
        id: users.id,
        role: users.role,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, userToken.userId))
      .limit(1);

    if (!currentUser[0]) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Utente non trovato' })
      };
    }

    // Only admins can update roles
    if (currentUser[0].role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Accesso negato: solo gli amministratori possono modificare i ruoli' })
      };
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = updateRoleSchema.parse(body);

    // Get the target employee information
    const targetEmployee = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        name: users.name
      })
      .from(users)
      .where(eq(users.id, validatedData.employeeId))
      .limit(1);

    if (!targetEmployee[0]) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Dipendente non trovato' })
      };
    }

    const employee = targetEmployee[0];

    // Super Admin protection: max.giurastante@omniaservices.net cannot be demoted
    if (employee.email === 'max.giurastante@omniaservices.net' && validatedData.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Impossibile modificare il ruolo del Super Amministratore',
          details: 'max.giurastante@omniaservices.net è il Super Amministratore e non può essere retrocesso'
        })
      };
    }

    // Check if the role is actually changing
    if (employee.role === validatedData.role) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Il dipendente ha già questo ruolo',
          details: `${employee.name} è già ${validatedData.role === 'admin' ? 'amministratore' : 'dipendente'}`
        })
      };
    }

    // Update the employee role
    const updatedEmployee = await db
      .update(users)
      .set({
        role: validatedData.role,
        updatedAt: new Date()
      })
      .where(eq(users.id, validatedData.employeeId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        updatedAt: users.updatedAt
      });

    if (!updatedEmployee[0]) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore durante l\'aggiornamento del ruolo' })
      };
    }

    // Create audit log
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: 'role_updated',
      adminId: currentUser[0].id,
      adminEmail: currentUser[0].email,
      targetEmployeeId: employee.id,
      targetEmployeeEmail: employee.email,
      targetEmployeeName: employee.name,
      oldRole: employee.role,
      newRole: validatedData.role,
      reason: validatedData.reason || 'Nessun motivo specificato'
    };

    console.log('Role update audit log:', JSON.stringify(auditLog));

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Ruolo di ${employee.name} aggiornato con successo`,
        data: {
          employee: updatedEmployee[0],
          previousRole: employee.role,
          newRole: validatedData.role,
          updatedBy: currentUser[0].email,
          updatedAt: updatedEmployee[0].updatedAt
        }
      })
    };

  } catch (error) {
    console.error('Update employee role error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Dati non validi', 
          details: error.issues?.map(e => `${e.path.join('.')}: ${e.message}`)
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