import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../../lib/db/index';
import { holidays, users } from '../../../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuthHeader, requireAccessToken, requireAdmin } from '../../../lib/auth/jwt-utils';

// Input validation schema
const approveRejectSchema = z.object({
  holidayId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().min(1, 'Motivo del rifiuto richiesto').max(500, 'Motivo non può superare 500 caratteri').optional()
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
    // Verify admin authentication
    const adminToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(adminToken);
    requireAdmin(adminToken);

    // Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const validatedData = approveRejectSchema.parse(body);

    // Validate rejection reason for reject action
    if (validatedData.action === 'reject' && !validatedData.rejectionReason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Motivo del rifiuto richiesto per le richieste rifiutate' })
      };
    }

    // Get holiday request with user information
    const holidayData = await db
      .select({
        holiday: holidays,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          holidayAllowance: users.holidayAllowance
        }
      })
      .from(holidays)
      .innerJoin(users, eq(holidays.userId, users.id))
      .where(eq(holidays.id, validatedData.holidayId))
      .limit(1);

    if (!holidayData[0]) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Richiesta di ferie non trovata' })
      };
    }

    const { holiday, user } = holidayData[0];

    // Check if holiday is still pending
    if (holiday.status !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Richiesta già ${holiday.status}da. Solo le richieste in attesa possono essere approvate/rifiutate.`,
          currentStatus: holiday.status
        })
      };
    }

    // Prevent admin from approving their own requests (if admin is also an employee)
    if (holiday.userId === adminToken.userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Non puoi approvare/rifiutare le tue stesse richieste' })
      };
    }

    // Check if holiday dates are still in the future for approvals
    if (validatedData.action === 'approve') {
      const startDate = new Date(holiday.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Non è possibile approvare richieste per date passate',
            code: 'PAST_DATE_APPROVAL'
          })
        };
      }
    }

    // Prepare update data
    const updateData: any = {
      status: validatedData.action === 'approve' ? 'approved' : 'rejected',
      approvedBy: adminToken.userId,
      approvedAt: new Date(),
      updatedAt: new Date()
    };

    // Add rejection reason if rejecting
    if (validatedData.action === 'reject' && validatedData.rejectionReason) {
      updateData.rejectionReason = validatedData.rejectionReason;
    }

    // Update holiday request
    const updatedHoliday = await db
      .update(holidays)
      .set(updateData)
      .where(eq(holidays.id, validatedData.holidayId))
      .returning();

    if (!updatedHoliday[0]) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore durante l\'aggiornamento della richiesta' })
      };
    }

    // Get admin info for audit log
    const adminData = await db
      .select({
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, adminToken.userId))
      .limit(1);

    // Log admin action for audit trail
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: `holiday_request_${validatedData.action}d`,
      adminId: adminToken.userId,
      adminEmail: adminToken.email,
      adminName: adminData[0]?.name || 'Unknown',
      targetUserId: holiday.userId,
      targetUserEmail: user.email,
      targetUserName: user.name,
      holidayId: validatedData.holidayId,
      details: {
        startDate: holiday.startDate,
        endDate: holiday.endDate,
        type: holiday.type,
        workingDays: holiday.workingDays,
        rejectionReason: validatedData.rejectionReason || null
      }
    };
    
    console.log('Holiday request processed:', JSON.stringify(auditLog));

    // Prepare response message
    const actionMessage = validatedData.action === 'approve' ? 'approvata' : 'rifiutata';
    const message = `Richiesta di ferie per ${user.name} (${holiday.startDate} - ${holiday.endDate}) ${actionMessage} con successo`;

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message,
        action: validatedData.action,
        holiday: {
          id: updatedHoliday[0].id,
          userId: updatedHoliday[0].userId,
          userName: user.name,
          userEmail: user.email,
          startDate: updatedHoliday[0].startDate,
          endDate: updatedHoliday[0].endDate,
          type: updatedHoliday[0].type,
          status: updatedHoliday[0].status,
          workingDays: updatedHoliday[0].workingDays,
          notes: updatedHoliday[0].notes,
          approvedBy: updatedHoliday[0].approvedBy,
          approvedAt: updatedHoliday[0].approvedAt,
          rejectionReason: updatedHoliday[0].rejectionReason,
          createdAt: updatedHoliday[0].createdAt,
          updatedAt: updatedHoliday[0].updatedAt
        }
      })
    };

  } catch (error) {
    console.error('Approve/reject holiday error:', error);

    // Handle authentication errors
    if (error instanceof Error && (error.message.includes('Token') || error.message.includes('Accesso negato'))) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

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

    // Handle business logic errors
    if (error instanceof Error) {
      return {
        statusCode: 400,
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