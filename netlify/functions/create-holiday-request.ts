import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { createHolidayWithAudit, getUserByEmail } from '../../lib/db/operations';
import { z } from 'zod';
import { format, parseISO, differenceInBusinessDays } from 'date-fns';

// Input validation schema
const createHolidaySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  type: z.enum(['vacation', 'sick', 'personal']),
  notes: z.string().optional(),
  medicalCertificateOption: z.string().optional(), // 'upload' or 'send_later'
  medicalCertificateFileName: z.string().optional(), // Nome del file se caricato
  medicalCertificateFileId: z.string().optional(), // ID del file nel blob storage
}).refine((data) => {
  if (data.type === 'sick') {
    // Per malattia, deve avere un'opzione per il certificato medico o un nome file
    const hasOption = data.medicalCertificateOption === 'upload' || data.medicalCertificateOption === 'send_later';
    const hasFile = data.medicalCertificateFileName && data.medicalCertificateFileName.trim() !== '';
    
    console.log('Medical certificate validation:', {
      type: data.type,
      option: data.medicalCertificateOption,
      fileName: data.medicalCertificateFileName,
      hasOption,
      hasFile
    });
    
    return hasOption || hasFile;
  }
  return true
}, {
  message: 'Il certificato medico è necessario per i congedi per malattia',
  path: ['medicalCertificateOption'],
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
    console.log('Received request body:', JSON.stringify(body, null, 2));
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

    // Get user details from database
    const user = await getUserByEmail(userToken.email);
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Utente non trovato nel database' })
      };
    }

    // Create holiday request in database
    const holidayData = {
      userId: user.id,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      type: validatedData.type as 'vacation' | 'sick' | 'personal',
      status: 'pending' as const,
      notes: validatedData.notes || '',
      workingDays: workingDays
    };

    // Get client IP and user agent for audit logging
    const ipAddress = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';

    const newHoliday = await createHolidayWithAudit(holidayData, ipAddress, userAgent);

    console.log('New holiday request created in database:', newHoliday.id);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Richiesta ferie creata con successo',
        data: {
          id: newHoliday.id,
          employeeId: newHoliday.userId,
          employeeName: user.name,
          employeeEmail: user.email,
          startDate: newHoliday.startDate,
          endDate: newHoliday.endDate,
          workingDays: newHoliday.workingDays,
          type: newHoliday.type,
          status: newHoliday.status,
          notes: newHoliday.notes,
          createdAt: newHoliday.createdAt?.toISOString() || new Date().toISOString(),
          // Medical certificate info for sick leave compatibility
          ...(validatedData.type === 'sick' && {
            medicalCertificateOption: validatedData.medicalCertificateOption || 'upload',
            medicalCertificateFileName: validatedData.medicalCertificateFileName,
            medicalCertificateFileId: validatedData.medicalCertificateFileId,
            medicalCertificateStatus: validatedData.medicalCertificateOption === 'send_later' 
              ? 'commitment_pending' 
              : validatedData.medicalCertificateFileId ? 'uploaded' : 'pending'
          })
        }
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
          details: error.issues 
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