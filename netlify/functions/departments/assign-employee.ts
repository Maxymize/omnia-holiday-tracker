import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../../lib/db/index';
import { departments, users } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuthFromRequest, requireAccessToken, requireAdmin } from '../../../lib/auth/jwt-utils';

// Input validation schema
const assignEmployeeSchema = z.object({
  employeeId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  action: z.enum(['assign', 'unassign'])
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

    // Validate that departmentId is provided for assign action
    if (validatedData.action === 'assign' && !validatedData.departmentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID dipartimento richiesto per assegnazione' })
      };
    }

    // Get employee information
    const employee = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        departmentId: users.departmentId
      })
      .from(users)
      .where(eq(users.id, validatedData.employeeId))
      .limit(1);

    if (!employee[0]) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Dipendente non trovato' })
      };
    }

    const emp = employee[0];

    // Check if employee is active
    if (emp.status !== 'active') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Solo dipendenti attivi possono essere assegnati ai dipartimenti',
          employeeStatus: emp.status
        })
      };
    }

    // Get current and target department information
    let currentDepartment = null;
    let targetDepartment = null;

    if (emp.departmentId) {
      const currentDept = await db
        .select({
          id: departments.id,
          name: departments.name,
          location: departments.location
        })
        .from(departments)
        .where(eq(departments.id, emp.departmentId))
        .limit(1);
      
      currentDepartment = currentDept[0] || null;
    }

    if (validatedData.departmentId) {
      const targetDept = await db
        .select({
          id: departments.id,
          name: departments.name,
          location: departments.location,
          managerId: departments.managerId
        })
        .from(departments)
        .where(eq(departments.id, validatedData.departmentId))
        .limit(1);

      if (!targetDept[0]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Dipartimento di destinazione non trovato' })
        };
      }

      targetDepartment = targetDept[0];
    }

    // Check for redundant operations
    if (validatedData.action === 'assign') {
      if (emp.departmentId === validatedData.departmentId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Dipendente già assegnato al dipartimento "${targetDepartment?.name}"`,
            code: 'ALREADY_ASSIGNED'
          })
        };
      }
    } else if (validatedData.action === 'unassign') {
      if (!emp.departmentId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Dipendente non è assegnato a nessun dipartimento',
            code: 'NOT_ASSIGNED'
          })
        };
      }
    }

    // Perform the assignment/unassignment
    const newDepartmentId = validatedData.action === 'assign' ? validatedData.departmentId : null;

    const updatedEmployee = await db
      .update(users)
      .set({
        departmentId: newDepartmentId,
        updatedAt: new Date()
      })
      .where(eq(users.id, validatedData.employeeId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        departmentId: users.departmentId,
        updatedAt: users.updatedAt
      });

    if (!updatedEmployee[0]) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore durante l\'aggiornamento dell\'assegnazione' })
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

    // Log assignment action for audit trail
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: `employee_department_${validatedData.action}ed`,
      adminId: adminToken.userId,
      adminEmail: adminToken.email,
      adminName: adminData[0]?.name || 'Unknown',
      employeeId: validatedData.employeeId,
      employeeName: emp.name,
      employeeEmail: emp.email,
      details: {
        action: validatedData.action,
        fromDepartment: currentDepartment ? {
          id: currentDepartment.id,
          name: currentDepartment.name,
          location: currentDepartment.location
        } : null,
        toDepartment: targetDepartment ? {
          id: targetDepartment.id,
          name: targetDepartment.name,
          location: targetDepartment.location
        } : null
      }
    };
    
    console.log('Employee department assignment:', JSON.stringify(auditLog));

    // Prepare response message
    let message;
    if (validatedData.action === 'assign') {
      message = `${emp.name} assegnato al dipartimento "${targetDepartment?.name}" con successo`;
    } else {
      message = `${emp.name} rimosso dal dipartimento "${currentDepartment?.name}" con successo`;
    }

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message,
        action: validatedData.action,
        employee: {
          id: updatedEmployee[0].id,
          name: updatedEmployee[0].name,
          email: updatedEmployee[0].email,
          department: targetDepartment ? {
            id: targetDepartment.id,
            name: targetDepartment.name,
            location: targetDepartment.location
          } : null,
          updatedAt: updatedEmployee[0].updatedAt
        },
        previousDepartment: currentDepartment ? {
          id: currentDepartment.id,
          name: currentDepartment.name,
          location: currentDepartment.location
        } : null
      })
    };

  } catch (error) {
    console.error('Assign employee error:', error);

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

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server' })
    };
  }
};