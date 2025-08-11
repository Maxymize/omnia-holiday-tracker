import { Handler } from '@netlify/functions';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { saveToMockStorage, loadFromMockStorage } from '../../lib/mock-storage';

// Input validation schema
const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve avere almeno 2 caratteri').max(100),
  email: z.string().email('Email non valida').toLowerCase(),
  password: z.string().min(8, 'Password deve avere almeno 8 caratteri'),
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
    const validatedData = registerSchema.parse(body);

    // Validate email domain (configurable from settings later)
    const allowedDomains = [
      'omniaservice.net', 
      'ominiaservice.net', 
      'omniaelectronics.com',
      'icloud.com' // Added for testing
    ];
    const emailDomain = validatedData.email.split('@')[1];
    
    if (!allowedDomains.includes(emailDomain)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Email non valida. Usa la tua email aziendale @omniaservice.net o @omniaelectronics.com' 
        })
      };
    }

    // Load existing registrations from mock storage
    const existingRegistrations = loadFromMockStorage('registrations') || [];
    
    // Check if user already exists
    const existingUser = existingRegistrations.find((user: any) => user.email === validatedData.email);
    if (existingUser) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Utente già registrato con questa email' })
      };
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

    // Generate unique ID
    const newId = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new user registration
    const newRegistration = {
      id: newId,
      name: validatedData.name,
      email: validatedData.email,
      passwordHash,
      role: 'employee',
      status: 'pending', // Requires admin approval
      holidayAllowance: 20, // Default Italian holiday allowance
      departmentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to mock storage
    const updatedRegistrations = [...existingRegistrations, newRegistration];
    saveToMockStorage('registrations', updatedRegistrations);

    // Log registration for audit trail
    console.log(`New user registration: ${validatedData.email} at ${new Date().toISOString()}`);

    // Return success response (don't expose user details)
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Registrazione completata! Attendi l\'approvazione dell\'amministratore.',
        requiresApproval: true
      })
    };

  } catch (error) {
    console.error('Registration error:', error);

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

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server' })
    };
  }
};