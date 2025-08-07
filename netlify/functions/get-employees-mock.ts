import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';

// Mock employee data for development
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
    holidaysUsed: 5,
    holidaysRemaining: 20,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: '2024-01-05T09:00:00.000Z'
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

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Verify authentication
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Check if user is admin
    if (userToken.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Accesso negato: privilegi amministratore richiesti' })
      };
    }

    console.log('Mock employees accessed by admin:', userToken.email);

    // Return mock employee data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          employees: mockEmployees,
          total: mockEmployees.length,
          active: mockEmployees.filter(e => e.status === 'active').length,
          pending: mockEmployees.filter(e => e.status === 'pending').length
        }
      })
    };

  } catch (error) {
    console.error('Get employees mock error:', error);

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