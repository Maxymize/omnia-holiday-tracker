import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../../lib/db/index';
import { holidays, users } from '../../../lib/db/schema';
import { eq, and, or, lte, gte, ne } from 'drizzle-orm';
import { verifyAuthHeader, requireAccessToken } from '../../../lib/auth/jwt-utils';

// Holiday types enum
const holidayTypes = ['vacation', 'sick', 'personal'] as const;

// Input validation schema
const editHolidaySchema = z.object({
  holidayId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data di inizio deve essere in formato YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data di fine deve essere in formato YYYY-MM-DD').optional(),
  type: z.enum(holidayTypes).optional(),
  notes: z.string().max(500, 'Le note non possono superare 500 caratteri').optional(),
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Content-Type': 'application/json'
};

// Calculate working days between two dates (excluding weekends)
function calculateWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  if (start > end) {
    throw new Error('Data di inizio non può essere successiva alla data di fine');
  }
  
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}

// Check for date overlaps with existing holidays (excluding current holiday)
async function checkDateOverlap(userId: string, startDate: string, endDate: string, excludeHolidayId: string): Promise<boolean> {
  const overlappingHolidays = await db
    .select()
    .from(holidays)
    .where(
      and(
        eq(holidays.userId, userId),
        ne(holidays.id, excludeHolidayId), // Exclude current holiday
        or(
          eq(holidays.status, 'approved'),
          eq(holidays.status, 'pending')
        ),
        or(
          and(
            lte(holidays.startDate, startDate),
            gte(holidays.endDate, startDate)
          ),
          and(
            lte(holidays.startDate, endDate),
            gte(holidays.endDate, endDate)
          ),
          and(
            gte(holidays.startDate, startDate),
            lte(holidays.endDate, endDate)
          ),
          and(
            lte(holidays.startDate, startDate),
            gte(holidays.endDate, endDate)
          )
        )
      )
    );

  return overlappingHolidays.length > 0;
}

// Validate dates
function validateDates(startDate: string, endDate: string): void {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (start < today) {
    throw new Error('La data di inizio non può essere nel passato');
  }
  
  if (start > end) {
    throw new Error('La data di inizio non può essere successiva alla data di fine');
  }
  
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  
  if (start > oneYearFromNow) {
    throw new Error('Non è possibile richiedere ferie con più di un anno di anticipo');
  }
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
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Verify authentication
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const validatedData = editHolidaySchema.parse(body);

    // Get existing holiday request
    const existingHoliday = await db
      .select()
      .from(holidays)
      .where(eq(holidays.id, validatedData.holidayId))
      .limit(1);

    if (!existingHoliday[0]) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Richiesta di ferie non trovata' })
      };
    }

    const holiday = existingHoliday[0];

    // Check ownership (only user who created the request can edit it, unless admin)
    const isAdmin = userToken.role === 'admin';
    if (!isAdmin && holiday.userId !== userToken.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Non autorizzato a modificare questa richiesta' })
      };
    }

    // Check if holiday can be edited (only pending or rejected holidays can be edited)
    if (holiday.status === 'approved') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Le richieste approvate non possono essere modificate. Contatta l\'amministratore.',
          code: 'APPROVED_NOT_EDITABLE'
        })
      };
    }

    // Check if holiday dates have passed (cannot edit past holidays)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidayStart = new Date(holiday.startDate);
    
    if (holidayStart < today) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Non è possibile modificare richieste per date passate',
          code: 'PAST_DATE_EDIT'
        })
      };
    }

    // Prepare update data with current values as defaults
    const newStartDate = validatedData.startDate || holiday.startDate;
    const newEndDate = validatedData.endDate || holiday.endDate;
    const newType = validatedData.type || holiday.type;
    const newNotes = validatedData.notes !== undefined ? validatedData.notes : holiday.notes;

    // Validate new dates if they are being changed
    if (validatedData.startDate || validatedData.endDate) {
      validateDates(newStartDate, newEndDate);
    }

    // Calculate new working days if dates changed
    let newWorkingDays = holiday.workingDays;
    if (validatedData.startDate || validatedData.endDate) {
      newWorkingDays = calculateWorkingDays(newStartDate, newEndDate);
      
      if (newWorkingDays === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'La richiesta deve includere almeno un giorno lavorativo' })
        };
      }
    }

    // Check for date overlaps if dates changed
    if (validatedData.startDate || validatedData.endDate) {
      const hasOverlap = await checkDateOverlap(holiday.userId, newStartDate, newEndDate, validatedData.holidayId);
      if (hasOverlap) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ 
            error: 'Le nuove date si sovrappongono con un\'altra richiesta esistente',
            code: 'DATE_OVERLAP'
          })
        };
      }
    }

    // Check holiday allowance if type changed to vacation or working days increased
    if ((newType === 'vacation' && holiday.type !== 'vacation') || 
        (newType === 'vacation' && newWorkingDays > holiday.workingDays)) {
      
      // Get user information
      const user = await db
        .select({
          holidayAllowance: users.holidayAllowance
        })
        .from(users)
        .where(eq(users.id, holiday.userId))
        .limit(1);

      if (!user[0]) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Utente non trovato' })
        };
      }

      // Get current year's used vacation days (excluding current holiday)
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      const usedDays = await db
        .select({
          workingDays: holidays.workingDays
        })
        .from(holidays)
        .where(
          and(
            eq(holidays.userId, holiday.userId),
            eq(holidays.type, 'vacation'),
            ne(holidays.id, validatedData.holidayId), // Exclude current holiday
            or(
              eq(holidays.status, 'approved'),
              eq(holidays.status, 'pending')
            ),
            gte(holidays.startDate, yearStart),
            lte(holidays.startDate, yearEnd)
          )
        );

      const totalUsedDays = usedDays.reduce((sum, h) => sum + h.workingDays, 0);
      const remainingDays = user[0].holidayAllowance - totalUsedDays;

      if (newWorkingDays > remainingDays) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Giorni di ferie insufficienti. Disponibili: ${remainingDays}, richiesti: ${newWorkingDays}`,
            code: 'INSUFFICIENT_ALLOWANCE',
            details: {
              requested: newWorkingDays,
              available: remainingDays,
              total: user[0].holidayAllowance,
              used: totalUsedDays
            }
          })
        };
      }
    }

    // Reset status to pending if it was rejected and now being edited
    let newStatus = holiday.status;
    if (holiday.status === 'rejected') {
      newStatus = 'pending';
    }

    // Update holiday request
    const updatedHoliday = await db
      .update(holidays)
      .set({
        startDate: newStartDate,
        endDate: newEndDate,
        type: newType,
        notes: newNotes,
        workingDays: newWorkingDays,
        status: newStatus,
        approvedBy: newStatus === 'pending' ? null : holiday.approvedBy, // Clear approver if status reset to pending
        approvedAt: newStatus === 'pending' ? null : holiday.approvedAt,
        rejectionReason: newStatus === 'pending' ? null : holiday.rejectionReason,
        updatedAt: new Date()
      })
      .where(eq(holidays.id, validatedData.holidayId))
      .returning();

    if (!updatedHoliday[0]) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore durante l\'aggiornamento della richiesta' })
      };
    }

    // Log holiday edit for audit trail
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: 'holiday_request_edited',
      userId: userToken.userId,
      userEmail: userToken.email,
      holidayId: validatedData.holidayId,
      isAdmin,
      changes: {
        startDate: { from: holiday.startDate, to: newStartDate },
        endDate: { from: holiday.endDate, to: newEndDate },
        type: { from: holiday.type, to: newType },
        workingDays: { from: holiday.workingDays, to: newWorkingDays },
        status: { from: holiday.status, to: newStatus },
        notes: { from: holiday.notes, to: newNotes }
      }
    };
    console.log('Holiday request edited:', JSON.stringify(auditLog));

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: newStatus !== holiday.status ? 
          'Richiesta modificata e sottoposta nuovamente per approvazione' :
          'Richiesta di ferie modificata con successo',
        holiday: {
          id: updatedHoliday[0].id,
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
        },
        statusChanged: newStatus !== holiday.status
      })
    };

  } catch (error) {
    console.error('Edit holiday request error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
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