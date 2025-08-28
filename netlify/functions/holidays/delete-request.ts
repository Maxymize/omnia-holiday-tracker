import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../../lib/auth/jwt-utils';
import { getUserByEmail, createAuditLog } from '../../../lib/db/operations';
import { db } from '../../../lib/db/index';
import { holidays } from '../../../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Input validation schema
const deleteHolidaySchema = z.object({
  holidayId: z.string().min(1, 'Holiday ID is required')
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow DELETE requests
  if (event.httpMethod !== 'DELETE') {
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
    const validatedData = deleteHolidaySchema.parse(body);

    // Get user details from database
    const user = await getUserByEmail(userToken.email);
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Utente non trovato nel database' })
      };
    }

    // Get the holiday request to verify ownership and get details for response
    const holidayToDelete = await db
      .select({
        id: holidays.id,
        userId: holidays.userId,
        startDate: holidays.startDate,
        endDate: holidays.endDate,
        type: holidays.type,
        status: holidays.status,
        workingDays: holidays.workingDays,
        notes: holidays.notes,
        createdAt: holidays.createdAt
      })
      .from(holidays)
      .where(eq(holidays.id, validatedData.holidayId))
      .limit(1);

    if (holidayToDelete.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Richiesta ferie non trovata' 
        })
      };
    }

    const holiday = holidayToDelete[0];

    // Verify the holiday request belongs to the authenticated user
    // (Only the user who created the request can delete it)
    if (holiday.userId !== user.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Non hai i permessi per eliminare questa richiesta ferie' 
        })
      };
    }

    // Delete the holiday request from database
    await db.delete(holidays).where(eq(holidays.id, validatedData.holidayId));

    // Create audit log entry for admin notification
    const ipAddress = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';

    try {
      await createAuditLog(
        'holiday_deleted', // action
        user.id, // userId (employee who deleted the request)
        {
          previousHolidayData: {
            startDate: holiday.startDate,
            endDate: holiday.endDate,
            type: holiday.type,
            status: holiday.status,
            workingDays: holiday.workingDays,
            notes: holiday.notes,
            createdAt: holiday.createdAt?.toISOString()
          },
          reason: 'Employee self-deletion'
        }, // details
        user.id, // targetUserId (same as userId for self-action)
        validatedData.holidayId, // targetResourceId
        'holiday', // resourceType
        ipAddress, // ipAddress
        userAgent // userAgent
      );
      console.log('Holiday deletion audit log created:', validatedData.holidayId);
    } catch (auditError) {
      console.warn('Failed to create audit log for holiday deletion:', auditError);
      // Don't fail the deletion if audit logging fails
    }

    console.log('Holiday request deleted successfully:', {
      holidayId: validatedData.holidayId,
      deletedBy: userToken.email,
      timestamp: new Date().toISOString()
    });

    // Return success response with deleted request details
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Richiesta ferie eliminata con successo',
        deletedRequest: {
          id: holiday.id,
          startDate: holiday.startDate,
          endDate: holiday.endDate,
          type: holiday.type,
          workingDays: holiday.workingDays
        }
      })
    };

  } catch (error) {
    console.error('Delete holiday request error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
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
        body: JSON.stringify({ 
          success: false,
          error: error.message 
        })
      };
    }

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Errore interno del server' 
      })
    };
  }
};