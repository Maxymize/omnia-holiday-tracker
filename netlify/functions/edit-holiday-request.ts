import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { saveToMockStorage, loadFromMockStorage } from '../../lib/mock-storage';
import { z } from 'zod';
import { format, parseISO, differenceInBusinessDays } from 'date-fns';

// Input validation schema for editing
const editHolidaySchema = z.object({
  holidayId: z.string().min(1, 'Holiday ID is required'),
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
    
    console.log('Medical certificate validation (edit):', {
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
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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

  // Only allow PUT requests
  if (event.httpMethod !== 'PUT') {
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
    console.log('Received edit request body:', JSON.stringify(body, null, 2));
    const validatedData = editHolidaySchema.parse(body);

    // Load existing requests
    const existingRequests = loadFromMockStorage('new-holiday-requests') || [];
    
    // Find the request to edit
    const requestIndex = existingRequests.findIndex((req: any) => req.id === validatedData.holidayId);
    
    if (requestIndex === -1) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Richiesta ferie non trovata' })
      };
    }

    const existingRequest = existingRequests[requestIndex];
    
    // Authorization check: Only the employee who created the request can edit it (or admin)
    if (userToken.role !== 'admin' && existingRequest.employeeId !== userToken.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Non puoi modificare le richieste di altri dipendenti' })
      };
    }

    // Check if the request can be edited (only pending requests)
    if (existingRequest.status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Puoi modificare solo le richieste in attesa di approvazione' 
        })
      };
    }

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

    // Check if dates are in the past (for vacation only)
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

    // Update the existing request
    const updatedRequest = {
      ...existingRequest, // Keep existing data like id, employeeId, etc.
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      workingDays: workingDays,
      type: validatedData.type,
      notes: validatedData.notes || '',
      updatedAt: new Date().toISOString(),
      updatedBy: userToken.email,
      // Medical certificate info for sick leave
      ...(validatedData.type === 'sick' && {
        medicalCertificateOption: validatedData.medicalCertificateOption || existingRequest.medicalCertificateOption || 'upload',
        medicalCertificateFileName: validatedData.medicalCertificateFileName || existingRequest.medicalCertificateFileName,
        medicalCertificateFileId: validatedData.medicalCertificateFileId || existingRequest.medicalCertificateFileId,
        medicalCertificateStatus: validatedData.medicalCertificateOption === 'send_later' 
          ? 'commitment_pending' 
          : validatedData.medicalCertificateFileId || existingRequest.medicalCertificateFileId 
            ? 'uploaded' 
            : 'pending'
      }),
      // Remove medical certificate info if changing from sick to other type
      ...(validatedData.type !== 'sick' && {
        medicalCertificateOption: undefined,
        medicalCertificateFileName: undefined,
        medicalCertificateFileId: undefined,
        medicalCertificateStatus: undefined
      })
    };

    console.log('Holiday request updated:', updatedRequest);

    // Update the array
    existingRequests[requestIndex] = updatedRequest;

    // Save updated requests back to mock storage
    try {
      saveToMockStorage('new-holiday-requests', existingRequests);
      console.log('Updated holiday request saved to mock storage');
    } catch (error) {
      console.error('Failed to save updated holiday request to mock storage:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore nel salvataggio delle modifiche' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Richiesta ferie modificata con successo',
        data: updatedRequest
      })
    };

  } catch (error) {
    console.error('Edit holiday request error:', error);

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