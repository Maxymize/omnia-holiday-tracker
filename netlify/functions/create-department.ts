import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
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
    // Verify authentication
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Check admin permissions
    if (userToken.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Solo gli amministratori possono creare dipartimenti' })
      };
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = createDepartmentSchema.parse(body);

    // For now, simulate department creation
    // In a real implementation, this would:
    // 1. Insert new department into database
    // 2. Set manager if provided
    // 3. Create department-specific permissions
    // 4. Send notification to manager

    const { name, location, managerId } = validatedData;
    
    // Generate mock department ID
    const departmentId = `dept_${Date.now()}`;
    
    console.log('Department creation (mock):', {
      departmentId,
      name,
      location: location || 'Non specificata',
      managerId: managerId || 'Nessun manager assegnato',
      createdBy: userToken.email,
      timestamp: new Date().toISOString()
    });

    // Mock created department
    const createdDepartment = {
      id: departmentId,
      name,
      location: location || null,
      managerId: managerId || null,
      managerName: managerId ? 'Manager Name' : null, // In real implementation, lookup manager name
      employeeCount: 0, // New department starts with 0 employees
      createdAt: new Date().toISOString(),
      createdBy: userToken.email
    };

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Dipartimento creato con successo',
        data: createdDepartment
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
          details: error.errors 
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

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server' })
    };
  }
};