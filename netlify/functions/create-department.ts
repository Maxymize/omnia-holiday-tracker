import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../lib/db/index';
import { departments, users } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuthHeader, requireAccessToken, requireAdmin } from '../../lib/auth/jwt-utils';

// Input validation schema
const createDepartmentSchema = z.object({
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
    const validatedData = createDepartmentSchema.parse(body);

    // Check if department name already exists
    const existingDepartment = await db
      .select()
      .from(departments)
      .where(eq(departments.name, validatedData.name))
      .limit(1);

    if (existingDepartment[0]) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          error: `Dipartimento con nome "${validatedData.name}" già esistente`,
          code: 'DEPARTMENT_NAME_EXISTS'
        })
      };
    }

    // If managerId provided, verify the user exists and is an employee
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

    // Create department
    const newDepartment = await db
      .insert(departments)
      .values({
        name: validatedData.name,
        location: validatedData.location || null,
        managerId: validatedData.managerId || null
      })
      .returning();

    if (!newDepartment[0]) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore durante la creazione del dipartimento' })
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

    // Log department creation for audit trail
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: 'department_created',
      adminId: adminToken.userId,
      adminEmail: adminToken.email,
      adminName: adminData[0]?.name || 'Unknown',
      departmentId: newDepartment[0].id,
      departmentName: newDepartment[0].name,
      details: {
        name: validatedData.name,
        location: validatedData.location,
        managerId: validatedData.managerId,
        managerName: managerInfo?.name || null,
        managerEmail: managerInfo?.email || null
      }
    };
    
    console.log('Department created:', JSON.stringify(auditLog));

    // Return success response
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Dipartimento "${validatedData.name}" creato con successo`,
        department: {
          id: newDepartment[0].id,
          name: newDepartment[0].name,
          location: newDepartment[0].location,
          manager: managerInfo ? {
            id: managerInfo.id,
            name: managerInfo.name,
            email: managerInfo.email
          } : null,
          employeeCount: 0, // New department starts with 0 employees
          createdAt: newDepartment[0].createdAt,
          updatedAt: newDepartment[0].updatedAt
        }
      })
    };

  } catch (error) {
    console.error('Create department error:', error);

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