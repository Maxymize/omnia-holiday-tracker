import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../../lib/db/index';
import { users, departments } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuthHeader, requireAccessToken, requireAdmin } from '../../../lib/auth/jwt-utils';
import bcrypt from 'bcryptjs';

// Input validation schema
const updateEmployeeSchema = z.object({
  employeeId: z.string().uuid(),
  updates: z.object({
    // Basic information
    name: z.string().min(2, 'Nome deve avere almeno 2 caratteri').max(100, 'Nome troppo lungo').optional(),
    email: z.string().email('Email non valida').optional(),
    
    // Status management
    status: z.enum(['active', 'inactive', 'pending']).optional(),
    
    // Role management
    role: z.enum(['employee', 'admin']).optional(),
    
    // Department assignment
    departmentId: z.string().uuid().nullable().optional(),
    
    // Holiday settings
    holidayAllowance: z.number()
      .int('Giorni ferie deve essere un numero intero')
      .min(1, 'Minimo 1 giorno di ferie')
      .max(50, 'Massimo 50 giorni di ferie')
      .optional(),
    
    // Password change (optional)
    newPassword: z.string()
      .min(8, 'Password deve avere almeno 8 caratteri')
      .max(100, 'Password troppo lunga')
      .optional(),
    
    // Admin notes - not stored in database schema, removed
  }).refine(data => {
    // At least one field must be provided
    return Object.keys(data).length > 0;
  }, {
    message: 'Almeno un campo da aggiornare è richiesto'
  })
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow PUT requests
  if (event.httpMethod !== 'PUT') {
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
    const validatedData = updateEmployeeSchema.parse(body);

    // Get current employee information
    const currentEmployee = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedData.employeeId))
      .limit(1);

    if (!currentEmployee[0]) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Dipendente non trovato' })
      };
    }

    const employee = currentEmployee[0];

    // Prevent admin from changing their own role or status (safety check)
    if (employee.id === adminToken.userId) {
      if (validatedData.updates.role && validatedData.updates.role !== 'admin') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Non puoi modificare il tuo ruolo admin',
            code: 'CANNOT_MODIFY_OWN_ROLE'
          })
        };
      }
      if (validatedData.updates.status && validatedData.updates.status !== 'active') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Non puoi disattivare il tuo account admin',
            code: 'CANNOT_DEACTIVATE_SELF'
          })
        };
      }
    }

    // Email uniqueness check if email is being changed
    if (validatedData.updates.email && validatedData.updates.email !== employee.email) {
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, validatedData.updates.email))
        .limit(1);

      if (existingUser[0]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Email già in uso da un altro utente',
            code: 'EMAIL_ALREADY_EXISTS'
          })
        };
      }
    }

    // Department validation if department is being assigned
    let targetDepartment = null;
    if (validatedData.updates.departmentId) {
      const dept = await db
        .select()
        .from(departments)
        .where(eq(departments.id, validatedData.updates.departmentId))
        .limit(1);

      if (!dept[0]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Dipartimento non trovato' })
        };
      }
      targetDepartment = dept[0];
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    // Track changes for audit log
    const changes: any[] = [];

    // Basic information updates
    if (validatedData.updates.name && validatedData.updates.name !== employee.name) {
      updateData.name = validatedData.updates.name;
      changes.push({
        field: 'name',
        oldValue: employee.name,
        newValue: validatedData.updates.name
      });
    }

    if (validatedData.updates.email && validatedData.updates.email !== employee.email) {
      updateData.email = validatedData.updates.email;
      changes.push({
        field: 'email',
        oldValue: employee.email,
        newValue: validatedData.updates.email
      });
    }

    // Status management
    if (validatedData.updates.status && validatedData.updates.status !== employee.status) {
      updateData.status = validatedData.updates.status;
      changes.push({
        field: 'status',
        oldValue: employee.status,
        newValue: validatedData.updates.status
      });
    }

    // Role management
    if (validatedData.updates.role && validatedData.updates.role !== employee.role) {
      updateData.role = validatedData.updates.role;
      changes.push({
        field: 'role',
        oldValue: employee.role,
        newValue: validatedData.updates.role
      });
    }

    // Department assignment
    if (validatedData.updates.hasOwnProperty('departmentId')) {
      if (validatedData.updates.departmentId !== employee.departmentId) {
        updateData.departmentId = validatedData.updates.departmentId;
        changes.push({
          field: 'departmentId',
          oldValue: employee.departmentId,
          newValue: validatedData.updates.departmentId
        });
      }
    }

    // Holiday allowance
    if (validatedData.updates.holidayAllowance && validatedData.updates.holidayAllowance !== employee.holidayAllowance) {
      updateData.holidayAllowance = validatedData.updates.holidayAllowance;
      changes.push({
        field: 'holidayAllowance',
        oldValue: employee.holidayAllowance,
        newValue: validatedData.updates.holidayAllowance
      });
    }

    // Password change
    if (validatedData.updates.newPassword) {
      const hashedPassword = await bcrypt.hash(validatedData.updates.newPassword, 12);
      updateData.passwordHash = hashedPassword;
      changes.push({
        field: 'password',
        oldValue: '[HIDDEN]',
        newValue: '[UPDATED]'
      });
    }

    // Admin notes - not stored in database schema, skip

    // Check if there are actually changes to make
    if (changes.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Nessuna modifica rilevata',
          code: 'NO_CHANGES_DETECTED'
        })
      };
    }

    // Perform the update
    const updatedEmployee = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, validatedData.employeeId))
      .returning();

    if (!updatedEmployee[0]) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore durante l\'aggiornamento del dipendente' })
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

    // Get current department info for response
    let currentDepartment = null;
    if (updatedEmployee[0].departmentId) {
      const dept = await db
        .select()
        .from(departments)
        .where(eq(departments.id, updatedEmployee[0].departmentId))
        .limit(1);
      currentDepartment = dept[0] || null;
    }

    // Comprehensive audit logging
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: 'employee_updated',
      adminId: adminToken.userId,
      adminEmail: adminToken.email,
      adminName: adminData[0]?.name || 'Unknown',
      employeeId: validatedData.employeeId,
      employeeName: updatedEmployee[0].name,
      employeeEmail: updatedEmployee[0].email,
      changes: changes,
      changesSummary: changes.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(', '),
      totalChanges: changes.length,
      criticalChanges: changes.filter(c => ['status', 'role', 'email'].includes(c.field))
    };
    
    console.log('Employee updated:', JSON.stringify(auditLog));

    // Log critical changes separately
    const criticalChanges = changes.filter(c => ['status', 'role', 'email'].includes(c.field));
    if (criticalChanges.length > 0) {
      console.warn('Critical employee changes:', JSON.stringify({
        adminEmail: adminToken.email,
        employeeEmail: updatedEmployee[0].email,
        criticalChanges: criticalChanges.map(c => ({ field: c.field, newValue: c.newValue }))
      }));
    }

    // Prepare response with updated employee data
    const responseEmployee = {
      id: updatedEmployee[0].id,
      name: updatedEmployee[0].name,
      email: updatedEmployee[0].email,
      role: updatedEmployee[0].role,
      status: updatedEmployee[0].status,
      department: currentDepartment ? {
        id: currentDepartment.id,
        name: currentDepartment.name,
        location: currentDepartment.location
      } : null,
      holidayAllowance: updatedEmployee[0].holidayAllowance,
      createdAt: updatedEmployee[0].createdAt,
      updatedAt: updatedEmployee[0].updatedAt,
      // lastLoginAt field doesn't exist in schema, removed
    };

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Dipendente ${updatedEmployee[0].name} aggiornato con successo`,
        employee: responseEmployee,
        changes: {
          summary: changes.map(c => ({
            field: c.field,
            changed: true,
            oldValue: c.field === 'password' ? '[HIDDEN]' : c.oldValue,
            newValue: c.field === 'password' ? '[UPDATED]' : c.newValue
          })),
          totalChanges: changes.length,
          criticalChanges: criticalChanges.length,
          updatedBy: {
            id: adminToken.userId,
            email: adminToken.email,
            name: adminData[0]?.name || 'Unknown'
          },
          timestamp: new Date().toISOString()
        },
        warnings: criticalChanges.length > 0 ? [
          'Sono state apportate modifiche critiche (status, ruolo, email). Verifica che siano corrette.'
        ] : []
      })
    };

  } catch (error) {
    console.error('Update employee error:', error);

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
          details: error.issues?.map(e => `${e.path.join('.')}: ${e.message}`)
        })
      };
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Formato JSON non valido' })
      };
    }

    // Handle bcrypt errors
    if (error instanceof Error && error.message.includes('bcrypt')) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore nella crittografia della password' })
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