import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken, requireAdminAccess } from '../../lib/auth/jwt-utils';
import { saveToMockStorage, loadFromMockStorage } from '../../lib/mock-storage';
import { z } from 'zod';

// Input validation schema
const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Nome dipartimento è richiesto').max(100, 'Nome troppo lungo'),
  location: z.string().max(200, 'Ubicazione troppo lunga').optional(),
  managerId: z.string().optional()
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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify authentication and admin role
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAdminAccess(userToken);

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = createDepartmentSchema.parse(body);

    // Load existing departments
    const existingDepartments = loadFromMockStorage('departments') || [];

    // Check if department name already exists
    const nameExists = existingDepartments.some((dept: any) => 
      dept.name.toLowerCase() === validatedData.name.toLowerCase()
    );

    if (nameExists) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Un dipartimento con questo nome esiste già' 
        })
      };
    }

    // If managerId is provided, verify the manager exists
    if (validatedData.managerId) {
      const employees = loadFromMockStorage('employees') || [];
      const managerExists = employees.some((emp: any) => 
        emp.id === validatedData.managerId && emp.status === 'active'
      );

      if (!managerExists) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Manager specificato non trovato o non attivo' 
          })
        };
      }
    }

    // Create new department
    const newDepartment = {
      id: `dept_${Date.now()}`,
      name: validatedData.name,
      location: validatedData.location || null,
      managerId: validatedData.managerId || null,
      managerName: null, // Will be populated when loading departments with employee data
      employeeCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If manager is specified, get manager name
    if (validatedData.managerId) {
      const employees = loadFromMockStorage('employees') || [];
      const manager = employees.find((emp: any) => emp.id === validatedData.managerId);
      if (manager) {
        newDepartment.managerName = manager.name;
      }
    }

    // Add to departments list
    const updatedDepartments = [...existingDepartments, newDepartment];
    saveToMockStorage('departments', updatedDepartments);

    console.log(`Department created: ${newDepartment.name} (ID: ${newDepartment.id}) by admin ${userToken.email}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: newDepartment,
        message: 'Dipartimento creato con successo'
      })
    };

  } catch (error) {
    console.error('Create department error:', error);

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