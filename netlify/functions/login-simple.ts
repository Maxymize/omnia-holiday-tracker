import { Handler } from '@netlify/functions';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Hardcoded admin user for testing
const ADMIN_USER = {
  id: 'admin-001',
  email: 'max.giurastante@omniaservices.net',
  name: 'Massimiliano Giurastante',
  passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY3LjNFrYJXNs2W', // admin123
  role: 'admin',
  status: 'active'
};

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

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
    
    // Check if it's the admin user
    if (email.toLowerCase() !== ADMIN_USER.email.toLowerCase()) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Credenziali non valide' })
      };
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, ADMIN_USER.passwordHash);
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Credenziali non valide' })
      };
    }
    
    // Generate JWT token
    const tokenPayload = {
      userId: ADMIN_USER.id,
      email: ADMIN_USER.email,
      role: ADMIN_USER.role,
      type: 'access'
    };

    const jwtSecret = process.env.JWT_SECRET || 'default-development-secret';
    const accessToken = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '1h' });

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
            id: ADMIN_USER.id,
            email: ADMIN_USER.email,
            name: ADMIN_USER.name,
            role: ADMIN_USER.role,
            status: ADMIN_USER.status,
            department: null,
            departmentName: null
          },
          accessToken
        }
      })
    };

  } catch (error: any) {
    console.error('Login error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore interno del server',
        details: error.message 
      })
    };
  }
};