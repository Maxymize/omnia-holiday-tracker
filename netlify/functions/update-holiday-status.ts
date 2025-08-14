import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { updateHolidayStatus, loadFromMockStorage } from '../../lib/mock-storage';
import { z } from 'zod';

// Input validation schema
const updateStatusSchema = z.object({
  holidayId: z.string().min(1, 'Holiday ID is required'),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  notes: z.string().optional()
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Content-Type': 'application/json'
};

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
    const validatedData = updateStatusSchema.parse(body);

    // Authorization check: different rules based on role and action
    const isAdmin = userToken.role === 'admin';
    const isEmployee = userToken.role === 'employee';
    
    // Find the holiday request to check ownership
    const mockHolidays = loadFromMockStorage('new-holiday-requests') || [];
    const holidayRequest = mockHolidays.find((h: any) => h.id === validatedData.holidayId);
    
    if (!holidayRequest) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Holiday request not found' })
      };
    }

    // Permission checks based on status change
    if (validatedData.status === 'approved' || validatedData.status === 'rejected') {
      // Only admins can approve or reject
      if (!isAdmin) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Solo gli amministratori possono approvare o rifiutare le ferie' })
        };
      }
    } else if (validatedData.status === 'cancelled') {
      // Employees can cancel their own requests, admins can cancel any
      if (isEmployee && holidayRequest.employeeId !== userToken.userId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Puoi annullare solo le tue richieste' })
        };
      }
      
      // Can only cancel pending requests
      if (holidayRequest.status !== 'pending') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Puoi annullare solo le richieste in attesa' })
        };
      }
    }

    // Update the shared mock storage
    updateHolidayStatus(
      validatedData.holidayId,
      validatedData.status,
      userToken.email,
      validatedData.notes
    );

    console.log('Holiday status updated:', {
      holidayId: validatedData.holidayId,
      status: validatedData.status,
      updatedBy: userToken.email,
      timestamp: new Date().toISOString()
    });

    // Prepare response message
    let message = '';
    switch (validatedData.status) {
      case 'approved':
        message = 'Richiesta ferie approvata con successo';
        break;
      case 'rejected':
        message = 'Richiesta ferie rifiutata';
        break;
      case 'cancelled':
        message = 'Richiesta ferie annullata con successo';
        break;
      default:
        message = 'Stato richiesta ferie aggiornato';
    }

    // Mock response with updated holiday
    const mockUpdatedHoliday = {
      id: validatedData.holidayId,
      status: validatedData.status,
      updatedBy: userToken.email,
      updatedAt: new Date().toISOString(),
      notes: validatedData.notes
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message,
        data: mockUpdatedHoliday
      })
    };

  } catch (error) {
    console.error('Update holiday status error:', error);

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