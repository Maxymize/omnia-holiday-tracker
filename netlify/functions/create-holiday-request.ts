import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { z } from 'zod';
import { format, parseISO, differenceInBusinessDays } from 'date-fns';

// Input validation schema
const createHolidaySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  type: z.enum(['vacation', 'sick', 'personal'], {
    errorMap: () => ({ message: 'Type must be vacation, sick, or personal' })
  }),
  notes: z.string().optional()
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Calculate working days between two dates (excluding weekends)
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  return differenceInBusinessDays(endDate, startDate) + 1;
}

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

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validatedData = createHolidaySchema.parse(body);

    // Parse dates
    const startDate = parseISO(validatedData.startDate);
    const endDate = parseISO(validatedData.endDate);

    // Validate date range
    if (startDate > endDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'La data di inizio deve essere prima della data di fine' 
        })
      };
    }

    // Check if dates are in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today && validatedData.type === 'vacation') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Non puoi richiedere ferie per date passate' 
        })
      };
    }

    // Calculate working days
    const workingDays = calculateWorkingDays(startDate, endDate);

    // For mock implementation, generate a new holiday request
    const newHoliday = {
      id: `h${Date.now()}`,
      employeeId: userToken.userId,
      employeeName: userToken.name || userToken.email.split('@')[0],
      employeeEmail: userToken.email,
      department: 'Department', // Would come from user profile in production
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      workingDays: workingDays,
      type: validatedData.type,
      status: 'pending',
      notes: validatedData.notes || '',
      createdAt: new Date().toISOString(),
      createdBy: userToken.email
    };

    console.log('New holiday request created:', newHoliday);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Richiesta ferie creata con successo',
        data: newHoliday
      })
    };

  } catch (error) {
    console.error('Create holiday request error:', error);

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