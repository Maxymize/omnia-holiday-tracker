import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../lib/db/index';
import { departments, users } from '../../lib/db/schema';
import { eq, and, not } from 'drizzle-orm';
import { verifyAuthHeader, requireAccessToken, requireAdmin } from '../../lib/auth/jwt-utils';

// Input validation schema
const updateDepartmentSchema = z.object({
  departmentId: z.string().uuid('ID dipartimento non valido'),
  name: z.string().min(2, 'Nome dipartimento deve avere almeno 2 caratteri').max(100, 'Nome troppo lungo'),
  location: z.string().min(1, 'Ubicazione richiesta').max(200, 'Ubicazione troppo lunga').optional(),
  managerId: z.string().uuid().optional()
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
    // Verify admin authentication
    const adminToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(adminToken);
    requireAdmin(adminToken);

    // Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const validatedData = updateDepartmentSchema.parse(body);

    // Check if department exists
    const existingDepartment = await db
      .select()
      .from(departments)
      .where(eq(departments.id, validatedData.departmentId))
      .limit(1);

    if (!existingDepartment[0]) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Dipartimento non trovato',
          code: 'DEPARTMENT_NOT_FOUND'
        })
      };
    }

    // Check if new name conflicts with other departments (excluding current one)
    const nameConflict = await db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.name, validatedData.name),
          not(eq(departments.id, validatedData.departmentId))
        )
      )
      .limit(1);

    if (nameConflict[0]) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          error: `Dipartimento con nome "${validatedData.name}" già esistente`,
          code: 'DEPARTMENT_NAME_EXISTS'
        })
      };
    }

    // If managerId provided, verify the user exists and is active
    let managerInfo = null;
    if (validatedData.managerId) {
      const manager = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          status: users.status
        })
        .from(users)
        .where(eq(users.id, validatedData.managerId))
        .limit(1);

      if (!manager[0]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Manager non trovato' })
        };
      }

      if (manager[0].status !== 'active') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Il manager deve essere un utente attivo',
            managerStatus: manager[0].status
          })
        };
      }

      managerInfo = manager[0];
    }

    // Update department
    const updatedDepartment = await db
      .update(departments)
      .set({
        name: validatedData.name,
        location: validatedData.location || null,
        managerId: validatedData.managerId || null,
        updatedAt: new Date()
      })
      .where(eq(departments.id, validatedData.departmentId))
      .returning();

    if (!updatedDepartment[0]) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore durante l\'aggiornamento del dipartimento' })
      };
    }

    // Get admin info for audit log
    const adminData = await db
      .select({
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, adminToken.userId))
      .limit(1);

    // Log department update for audit trail
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: 'department_updated',
      adminId: adminToken.userId,
      adminEmail: adminToken.email,
      adminName: adminData[0]?.name || 'Unknown',
      departmentId: updatedDepartment[0].id,
      departmentName: updatedDepartment[0].name,
      changes: {
        from: {
          name: existingDepartment[0].name,
          location: existingDepartment[0].location,
          managerId: existingDepartment[0].managerId
        },
        to: {
          name: validatedData.name,
          location: validatedData.location,
          managerId: validatedData.managerId,
          managerName: managerInfo?.name || null,
          managerEmail: managerInfo?.email || null
        }
      }
    };
    
    console.log('Department updated:', JSON.stringify(auditLog));

    // Get employee count for the department
    const employeeCount = await db
      .select({ count: users.id })
      .from(users)
      .where(eq(users.departmentId, updatedDepartment[0].id));

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Dipartimento "${validatedData.name}" aggiornato con successo`,
        department: {
          id: updatedDepartment[0].id,
          name: updatedDepartment[0].name,
          location: updatedDepartment[0].location,
          manager: managerInfo ? {
            id: managerInfo.id,
            name: managerInfo.name,
            email: managerInfo.email
          } : null,
          employeeCount: employeeCount.length,
          createdAt: updatedDepartment[0].createdAt,
          updatedAt: updatedDepartment[0].updatedAt
        }
      })
    };

  } catch (error) {
    console.error('Update department error:', error);

    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('Token') || error.message.includes('Accesso negato'))) {
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
          details: error.issues?.map(e => e.message) || [error.message]
        })
      };
    }

    // Handle database errors
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Nome dipartimento già in uso' })
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