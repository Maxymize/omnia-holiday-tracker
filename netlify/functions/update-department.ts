import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken, requireAdminAccess } from '../../lib/auth/jwt-utils';
import { saveToMockStorage, loadFromMockStorage } from '../../lib/mock-storage';
import { z } from 'zod';

// Validation schema for department update
const updateDepartmentSchema = z.object({
  departmentId: z.string().min(1, 'Department ID is required'),
  name: z.string().min(1, 'Department name is required').max(100, 'Department name too long'),
  location: z.string().max(200, 'Location too long').optional(),
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
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Verify authentication and admin role
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAdminAccess(userToken);

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = updateDepartmentSchema.parse(body);

    // Load existing departments
    const existingDepartments = loadFromMockStorage('departments') || [];

    // Find the department to update
    const departmentIndex = existingDepartments.findIndex((dept: any) => dept.id === validatedData.departmentId);

    if (departmentIndex === -1) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Dipartimento non trovato' 
        })
      };
    }

    // Check if new name conflicts with existing departments (excluding current one)
    const nameConflict = existingDepartments.some((dept: any, index: number) => 
      index !== departmentIndex && 
      dept.name.toLowerCase() === validatedData.name.toLowerCase()
    );

    if (nameConflict) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Un altro dipartimento con questo nome esiste già' 
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

    // Update department
    const updatedDepartment = {
      ...existingDepartments[departmentIndex],
      name: validatedData.name,
      location: validatedData.location || null,
      managerId: validatedData.managerId || null,
      managerName: null, // Will be populated below
      updatedAt: new Date().toISOString()
    };

    // If manager is specified, get manager name
    if (validatedData.managerId) {
      const employees = loadFromMockStorage('employees') || [];
      const manager = employees.find((emp: any) => emp.id === validatedData.managerId);
      if (manager) {
        updatedDepartment.managerName = manager.name;
      }
    }

    // Update the department in the array
    existingDepartments[departmentIndex] = updatedDepartment;
    saveToMockStorage('departments', existingDepartments);

    console.log(`Department updated: ${updatedDepartment.name} (ID: ${updatedDepartment.id}) by admin ${userToken.email}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: updatedDepartment,
        message: 'Dipartimento aggiornato con successo'
      })
    };

  } catch (error) {
    console.error('Update department error:', error);

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