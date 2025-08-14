import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { loadFromMockStorage, saveToMockStorage } from '../../lib/mock-storage';

// Default mock department data for development - loaded once
const defaultMockDepartments = [
  {
    id: 'dept1',
    name: 'IT Development',
    location: 'Milano',
    managerId: 'e1',
    managerName: 'Mario Rossi',
    employeeCount: 5,
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'dept2',
    name: 'Marketing',
    location: 'Roma',
    managerId: 'e2',
    managerName: 'Giulia Bianchi',
    employeeCount: 3,
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'dept3',
    name: 'Sales',
    location: 'Napoli',
    managerId: null,
    managerName: null,
    employeeCount: 2,
    createdAt: '2024-01-01T00:00:00.000Z'
  }
];

// Function to initialize departments if storage is empty
function getDepartments() {
  const storedDepartments = loadFromMockStorage('departments');
  
  if (!storedDepartments || storedDepartments.length === 0) {
    // Initialize with default departments
    saveToMockStorage('departments', defaultMockDepartments);
    return defaultMockDepartments;
  }
  
  return storedDepartments;
}

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

    console.log('Mock departments accessed by:', userToken.email);

    // Get departments from storage (with initialization if empty)
    const departments = getDepartments();

    // Return department data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: departments
      })
    };

  } catch (error) {
    console.error('Get departments mock error:', error);

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