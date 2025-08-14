import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken, requireAdminAccess } from '../../lib/auth/jwt-utils';
import { saveToMockStorage, loadFromMockStorage } from '../../lib/mock-storage';
import { z } from 'zod';

// Validation schema for employee department assignment
const assignDepartmentSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  departmentId: z.string().optional().nullable()
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
    // Verify authentication and admin role
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAdminAccess(userToken);

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = assignDepartmentSchema.parse(body);

    // Load employees using the same logic as get-employees-mock
    const mockEmployees = [
      {
        id: 'e1',
        name: 'Mario Rossi',
        email: 'mario.rossi@ominiaservice.net',
        role: 'employee',
        status: 'active',
        department: 'dept1',
        departmentName: 'IT Development',
        holidayAllowance: 25,
        holidaysUsed: 8,
        holidaysRemaining: 17,
        createdAt: '2024-01-01T00:00:00.000Z',
        lastLogin: '2024-01-04T14:20:00.000Z'
      },
      {
        id: 'e2',
        name: 'Giulia Bianchi',
        email: 'giulia.bianchi@ominiaservice.net',
        role: 'employee',
        status: 'active',
        department: 'dept2',
        departmentName: 'Marketing',
        holidayAllowance: 25,
        holidaysUsed: 8,
        holidaysRemaining: 17,
        createdAt: '2024-01-02T00:00:00.000Z',
        lastLogin: '2024-01-05T10:30:00.000Z'
      },
      {
        id: 'e3',
        name: 'Luca Verdi',
        email: 'luca.verdi@ominiaservice.net',
        role: 'employee',
        status: 'pending',
        department: 'dept1',
        departmentName: 'IT Development',
        holidayAllowance: 25,
        holidaysUsed: 0,
        holidaysRemaining: 25,
        createdAt: '2024-01-05T00:00:00.000Z',
        lastLogin: null
      }
    ];

    // Load new registrations from mock storage
    const registrations = loadFromMockStorage('registrations') || [];
    
    // Load departments to get department names
    const departments = loadFromMockStorage('departments') || [];
    
    // Convert registrations to employee format
    const registrationEmployees = registrations.map((reg: any) => {
      let departmentName = 'Non assegnato';
      if (reg.departmentId) {
        const department = departments.find((dept: any) => dept.id === reg.departmentId);
        departmentName = department ? department.name : 'Sconosciuto';
      }
      
      return {
        id: reg.id,
        name: reg.name,
        email: reg.email,
        role: reg.role,
        status: reg.status,
        department: reg.departmentId,
        departmentName,
        holidayAllowance: reg.holidayAllowance,
        holidaysUsed: 0,
        holidaysRemaining: reg.holidayAllowance,
        createdAt: reg.createdAt,
        lastLogin: null
      };
    });

    // Combine all employees (hardcoded + registrations)
    const existingEmployees = [...mockEmployees, ...registrationEmployees];

    // Find the employee to update
    const employeeIndex = existingEmployees.findIndex((emp: any) => emp.id === validatedData.employeeId);

    if (employeeIndex === -1) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Dipendente non trovato' 
        })
      };
    }

    // If departmentId is provided, verify the department exists
    let departmentName = null;
    if (validatedData.departmentId) {
      const departments = loadFromMockStorage('departments') || [];
      const department = departments.find((dept: any) => dept.id === validatedData.departmentId);

      if (!department) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Dipartimento specificato non trovato' 
          })
        };
      }
      departmentName = department.name;
    }

    const employeeToUpdate = existingEmployees[employeeIndex];
    
    // Check if this is a hardcoded employee (e1, e2, e3) or a registration
    const isRegistration = !['e1', 'e2', 'e3'].includes(employeeToUpdate.id);
    
    if (isRegistration) {
      // Update in registrations storage
      const registrations = loadFromMockStorage('registrations') || [];
      const regIndex = registrations.findIndex((reg: any) => reg.id === employeeToUpdate.id);
      
      if (regIndex !== -1) {
        registrations[regIndex] = {
          ...registrations[regIndex],
          departmentId: validatedData.departmentId || null,
          updatedAt: new Date().toISOString()
        };
        saveToMockStorage('registrations', registrations);
      }
    } else {
      // For hardcoded employees, we could save to a separate employees storage
      // For now, we'll just update in memory (this is mock data anyway)
    }

    // Create the updated employee object for response
    const updatedEmployee = {
      ...employeeToUpdate,
      department: validatedData.departmentId || null,
      departmentName: departmentName,
      updatedAt: new Date().toISOString()
    };

    console.log(`Employee department assigned: ${updatedEmployee.name} assigned to department ${departmentName || 'None'} by admin ${userToken.email}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: updatedEmployee,
        message: 'Dipartimento assegnato con successo'
      })
    };

  } catch (error) {
    console.error('Assign employee department error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Dati non validi', 
          details: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        })
      };
    }

    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('Token') || error.message.includes('Admin'))) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
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