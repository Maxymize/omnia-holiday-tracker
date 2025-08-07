import { Handler } from '@netlify/functions';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getUserByEmail } from '../../../lib/db/helpers';
import { generateTokens, createTokenCookies } from '../../../lib/auth/jwt-utils';

// Input validation schema
const loginSchema = z.object({
  email: z.string().email('Email non valida').toLowerCase(),
  password: z.string().min(1, 'Password richiesta'),
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
    // Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const validatedData = loginSchema.parse(body);

    // Get user from database
    const user = await getUserByEmail(validatedData.email);
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Email o password non validi' })
      };
    }

    // Check if user account is active
    if (user.status === 'pending') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Il tuo account è in attesa di approvazione dall\'amministratore',
          status: 'pending'
        })
      };
    }

    if (user.status === 'inactive') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Il tuo account è stato disattivato. Contatta l\'amministratore',
          status: 'inactive'
        })
      };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.passwordHash);
    if (!isPasswordValid) {
      // Log failed login attempt
      console.log(`Failed login attempt for: ${validatedData.email} at ${new Date().toISOString()}`);
      
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Email o password non validi' })
      };
    }

    // Generate JWT tokens
    const { accessToken, refreshToken, expiresIn } = generateTokens(user.id, user.email, user.role);
    
    // Create secure cookies
    const cookieHeaders = createTokenCookies(accessToken, refreshToken);

    // Log successful login for audit trail
    console.log(`Successful login: ${user.email} (${user.role}) at ${new Date().toISOString()}`);

    // Return success response with tokens
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': cookieHeaders.join(', ')
      },
      body: JSON.stringify({
        success: true,
        message: 'Login effettuato con successo',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
          holidayAllowance: user.holidayAllowance
        },
        // Also return tokens in body for client-side storage if needed
        tokens: {
          accessToken,
          refreshToken,
          expiresIn
        }
      })
    };

  } catch (error) {
    console.error('Login error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Dati non validi', 
          details: error.issues?.map(e => e.message) || [error.message]
        })
      };
    }

    // Handle JWT errors
    if (error instanceof Error && error.message.includes('JWT_SECRET')) {
      console.error('JWT configuration error');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore di configurazione del server' })
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