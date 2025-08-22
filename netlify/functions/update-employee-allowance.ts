import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { updateEmployeeHolidayAllowance, getUserByEmail, getUserById } from '../../lib/db/operations';
import { createAuditLog } from '../../lib/db/helpers';
import { z } from 'zod';

// Input validation schema
const updateAllowanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  holidayAllowance: z.number().min(0, 'Holiday allowance must be non-negative').max(365, 'Holiday allowance cannot exceed 365 days'),
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
  console.log('UPDATE-EMPLOYEE-ALLOWANCE: Function started');
  
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
    // Verify authentication
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Check admin permissions
    if (userToken.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Solo gli amministratori possono modificare i giorni di ferie dei dipendenti' })
      };
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = updateAllowanceSchema.parse(body);
    const { employeeId, holidayAllowance, reason } = validatedData;
    
    // Get admin user details
    const adminUser = await getUserByEmail(userToken.email);
    if (!adminUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Amministratore non trovato nel database' })
      };
    }

    // Get employee details
    const employee = await getUserById(employeeId);
    if (!employee) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Dipendente non trovato' })
      };
    }
    
    // Store previous allowance for audit
    const previousAllowance = employee.holidayAllowance;
    
    // Update employee holiday allowance
    await updateEmployeeHolidayAllowance(employeeId, holidayAllowance);

    // Create audit log
    const ipAddress = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';
    
    await createAuditLog(
      'employee_allowance_updated',
      adminUser.id,
      {
        employeeId,
        employeeName: employee.name,
        employeeEmail: employee.email,
        previousAllowance,
        newAllowance: holidayAllowance,
        reason: reason || 'Nessuna ragione specificata'
      },
      employeeId,
      employeeId,
      'user',
      ipAddress,
      userAgent
    );
    
    console.log('Employee holiday allowance updated:', {
      employeeId,
      employeeName: employee.name,
      previousAllowance,
      newAllowance: holidayAllowance,
      updatedBy: adminUser.email,
      reason: reason || 'No reason provided',
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Giorni di ferie aggiornati con successo per ${employee.name}`,
        data: {
          employeeId,
          employeeName: employee.name,
          previousAllowance,
          newAllowance: holidayAllowance,
          updatedBy: adminUser.email,
          updatedAt: new Date().toISOString(),
          reason
        }
      })
    };

  } catch (error: any) {
    console.error('UPDATE-EMPLOYEE-ALLOWANCE Error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
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
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

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