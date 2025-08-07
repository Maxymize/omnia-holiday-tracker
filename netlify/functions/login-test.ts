import { Handler } from '@netlify/functions';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Simulazione connessione database per test rapido
const testUsers = [
  {
    id: 'c2c282ce-5723-4049-8428-7a28d4a12b73',
    email: 'max.giurastante@ominiaservices.net',
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

    // Trova utente
    const user = testUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Credenziali non valide' })
      };
    }

    // Verifica password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Credenziali non valide' })
      };
    }

    // Genera JWT token with proper format for jwt-utils validation
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access' // Required by requireAccessToken function
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: '1h' });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status
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