import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../lib/db/index';
import { users, departments } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuthFromRequest, requireAccessToken, requireAdmin } from '../../lib/auth/jwt-utils';

// Input validation schema
const assignEmployeeSchema = z.object({
  employeeId: z.string().uuid('ID dipendente non valido'),
  departmentId: z.string().uuid('ID dipartimento non valido').nullable()
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
    const adminToken = await verifyAuthFromRequest(event);
    requireAccessToken(adminToken);
    requireAdmin(adminToken);

    // Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const validatedData = assignEmployeeSchema.parse(body);

    // Verify employee exists
    const existingEmployee = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedData.employeeId))
      .limit(1);

    if (!existingEmployee[0]) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Dipendente non trovato' })
      };
    }

    // Verify department exists (only if not null/unassigning)
    let existingDepartment = null;
    if (validatedData.departmentId) {
      const departmentResult = await db
        .select()
        .from(departments)
        .where(eq(departments.id, validatedData.departmentId))
        .limit(1);

      if (!departmentResult[0]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Dipartimento non trovato' })
        };
      }
      existingDepartment = departmentResult[0];
    }

    // Update employee to assign to department
    const updatedEmployee = await db
      .update(users)
      .set({ 
        departmentId: validatedData.departmentId,
        updatedAt: new Date()
      })
      .where(eq(users.id, validatedData.employeeId))
      .returning();

    if (!updatedEmployee[0]) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore durante l\'assegnazione del dipendente' })
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

    // Log assignment for audit trail
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: validatedData.departmentId ? 'employee_assigned_to_department' : 'employee_unassigned_from_department',
      adminId: adminToken.userId,
      adminEmail: adminToken.email,
      adminName: adminData[0]?.name || 'Unknown',
      employeeId: validatedData.employeeId,
      employeeName: existingEmployee[0].name,
      employeeEmail: existingEmployee[0].email,
      departmentId: validatedData.departmentId,
      departmentName: existingDepartment?.name || null,
      previousDepartmentId: existingEmployee[0].departmentId || null
    };
    
    console.log('Employee department assignment changed:', JSON.stringify(auditLog));

    const successMessage = validatedData.departmentId 
      ? `Dipendente "${existingEmployee[0].name}" assegnato al dipartimento "${existingDepartment!.name}" con successo`
      : `Dipendente "${existingEmployee[0].name}" rimosso dal dipartimento con successo`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: successMessage,
        employee: {
          id: updatedEmployee[0].id,
          name: updatedEmployee[0].name,
          email: updatedEmployee[0].email,
          departmentId: updatedEmployee[0].departmentId,
          departmentName: existingDepartment?.name || null,
          updatedAt: updatedEmployee[0].updatedAt
        }
      })
    };

  } catch (error) {
    console.error('Assign employee to department error:', error);
    
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
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore interno del server'
      })
    };
  }
};