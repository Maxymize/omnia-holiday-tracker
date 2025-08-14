import { Handler } from '@netlify/functions';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loadFromMockStorage, getEmployeeStatus } from '../../lib/mock-storage';

// Simulazione connessione database per test rapido
const testUsers = [
  {
    id: 'c2c282ce-5723-4049-8428-7a28d4a12b73',
    email: 'max.giurastante@omniaservices.net',
    name: 'Massimiliano Giurastante',
    passwordHash: '$2b$12$qPfeGTGXjHda4ru0hoF.5OWtClfftXPCKDf4Sr7gQej.pN9AyYBpe', // admin123
    role: 'admin',
    status: 'active'
  }
];

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email e password sono richiesti' })
      };
    }

    // Load registered users from mock storage
    const registrations = loadFromMockStorage('registrations') || [];
    
    // Convert registrations to user format and combine with test users
    const registeredUsers = registrations.map((reg: any) => ({
      id: reg.id,
      email: reg.email,
      name: reg.name,
      passwordHash: reg.passwordHash,
      role: reg.role,
      status: reg.status
    }));
    
    // Combine hardcoded test users with registered users
    const allUsers = [...testUsers, ...registeredUsers];
    
    // Trova utente tra tutti gli utenti disponibili
    const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      console.log(`Login attempt for unknown user: ${email}`);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Credenziali non valide' })
      };
    }
    
    // Check for status updates from admin panel
    const updatedStatus = getEmployeeStatus(user.id);
    const finalStatus = updatedStatus || user.status;
    
    // Check if user is approved (active or approved status)
    if (finalStatus !== 'active' && finalStatus !== 'approved') {
      console.log(`Login attempt for unapproved user: ${email} (original status: ${user.status}, updated: ${updatedStatus || 'none'})`);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Account in attesa di approvazione' })
      };
    }
    
    console.log(`Successful login for user: ${email} (status: ${finalStatus})`)

    // Verifica password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Credenziali non valide' })
      };
    }

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
    const mockEmployee = mockEmployees.find(emp => emp.email.toLowerCase() === user.email.toLowerCase());
    if (mockEmployee) {
      department = mockEmployee.department;
      departmentName = mockEmployee.departmentName;
    } else {
      // Check if this user has been assigned to a department (for registered users)
      const registrations = loadFromMockStorage('registrations') || [];
      const userRegistration = registrations.find((reg: any) => reg.id === user.id);
      
      if (userRegistration && userRegistration.departmentId) {
        department = userRegistration.departmentId;
        
        // Get department name
        const departments = loadFromMockStorage('departments') || [];
        const departmentInfo = departments.find((dept: any) => dept.id === userRegistration.departmentId);
        departmentName = departmentInfo ? departmentInfo.name : 'Sconosciuto';
      }
    }

    // Genera JWT token with proper format for jwt-utils validation
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access' // Required by requireAccessToken function
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: '1h' });

    // Create secure cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = `HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Strict; Path=/`;
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': `auth-token=${accessToken}; Max-Age=3600; ${cookieOptions}`
      },
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: finalStatus,
            department,
            departmentName
          },
          accessToken
        }
      })
    };

  } catch (error) {
    console.error('Login error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server' })
    };
  }
};