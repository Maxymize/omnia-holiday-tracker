import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { loadFromMockStorage } from '../../lib/mock-storage';

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

    // Get user department information
    let department = null;
    let departmentName = null;
    
    // Load employees to get department information
    const mockEmployees = [
      {
        id: 'e1',
        name: 'Mario Rossi',
        email: 'mario.rossi@ominiaservice.net',
        department: 'dept1',
        departmentName: 'IT Development'
      },
      {
        id: 'e2',
        name: 'Giulia Bianchi',
        email: 'giulia.bianchi@ominiaservice.net',
        department: 'dept2',
        departmentName: 'Marketing'
      },
      {
        id: 'e3',
        name: 'Luca Verdi',
        email: 'luca.verdi@ominiaservice.net',
        department: 'dept1',
        departmentName: 'IT Development'
      }
    ];
    
    // Check if this is a hardcoded employee
    const mockEmployee = mockEmployees.find(emp => emp.email.toLowerCase() === userToken.email.toLowerCase());
    if (mockEmployee) {
      department = mockEmployee.department;
      departmentName = mockEmployee.departmentName;
    } else {
      // Check if this user has been assigned to a department (for registered users)
      const registrations = loadFromMockStorage('registrations') || [];
      const userRegistration = registrations.find((reg: any) => reg.id === userToken.userId);
      
      if (userRegistration && userRegistration.departmentId) {
        department = userRegistration.departmentId;
        
        // Get department name
        const departments = loadFromMockStorage('departments') || [];
        const departmentInfo = departments.find((dept: any) => dept.id === userRegistration.departmentId);
        departmentName = departmentInfo ? departmentInfo.name : 'Sconosciuto';
      }
    }

    // Return user profile with updated department information
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: userToken.userId,
            email: userToken.email,
            name: userToken.name || userToken.email.split('@')[0], // Fallback to email prefix
            role: userToken.role,
            status: 'active', // Since they're authenticated, they're active
            department,
            departmentName
          }
        }
      })
    };

  } catch (error) {
    console.error('Get profile error:', error);

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