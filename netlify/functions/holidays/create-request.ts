import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../../lib/db/index';
import { holidays, users } from '../../../lib/db/schema';
import { eq, and, or, lte, gte } from 'drizzle-orm';
import { verifyAuthHeader, requireAccessToken } from '../../../lib/auth/jwt-utils';

// Holiday types enum
const holidayTypes = ['vacation', 'sick', 'personal'] as const;

// Input validation schema
const createHolidaySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data di inizio deve essere in formato YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data di fine deve essere in formato YYYY-MM-DD'),
  type: z.enum(holidayTypes),
  notes: z.string().max(500, 'Le note non possono superare 500 caratteri').optional(),
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Calculate working days between two dates (excluding weekends)
function calculateWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  // Ensure start is not after end
  if (start > end) {
    throw new Error('Data di inizio non può essere successiva alla data di fine');
  }
  
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}

// Check for date overlaps with existing holidays
async function checkDateOverlap(userId: string, startDate: string, endDate: string): Promise<boolean> {
  const overlappingHolidays = await db
    .select()
    .from(holidays)
    .where(
      and(
        eq(holidays.userId, userId),
        or(
          eq(holidays.status, 'approved'),
          eq(holidays.status, 'pending')
        ),
        or(
          // New holiday starts during existing holiday
          and(
            lte(holidays.startDate, startDate),
            gte(holidays.endDate, startDate)
          ),
          // New holiday ends during existing holiday
          and(
            lte(holidays.startDate, endDate),
            gte(holidays.endDate, endDate)
          ),
          // New holiday completely contains existing holiday
          and(
            gte(holidays.startDate, startDate),
            lte(holidays.endDate, endDate)
          ),
          // Existing holiday completely contains new holiday
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
  today.setHours(0, 0, 0, 0); // Reset time to compare dates only
  
  // Check if start date is in the past (allow today)
  if (start < today) {
    throw new Error('La data di inizio non può essere nel passato');
  }
  
  // Check if start date is after end date
  if (start > end) {
    throw new Error('La data di inizio non può essere successiva alla data di fine');
  }
  
  // Check if dates are more than 1 year in advance
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
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
    const validatedData = createHolidaySchema.parse(body);

    // Validate dates
    validateDates(validatedData.startDate, validatedData.endDate);

    // Calculate working days
    const workingDays = calculateWorkingDays(validatedData.startDate, validatedData.endDate);
    
    if (workingDays === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'La richiesta deve includere almeno un giorno lavorativo' })
      };
    }

    // Check for date overlaps
    const hasOverlap = await checkDateOverlap(userToken.userId, validatedData.startDate, validatedData.endDate);
    if (hasOverlap) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ 
          error: 'Le date selezionate si sovrappongono con una richiesta esistente',
          code: 'DATE_OVERLAP'
        })
      };
    }

    // Get user to check holiday allowance
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        holidayAllowance: users.holidayAllowance,
        departmentId: users.departmentId
      })
      .from(users)
      .where(eq(users.id, userToken.userId))
      .limit(1);

    if (!user[0]) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Utente non trovato' })
      };
    }

    // Check if user has enough holiday allowance (only for vacation type)
    if (validatedData.type === 'vacation') {
      // Get current year's approved/pending vacation days
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
            eq(holidays.userId, userToken.userId),
            eq(holidays.type, 'vacation'),
            or(
              eq(holidays.status, 'approved'),
              eq(holidays.status, 'pending')
            ),
            gte(holidays.startDate, yearStart),
            lte(holidays.startDate, yearEnd)
          )
        );

      const totalUsedDays = usedDays.reduce((sum, holiday) => sum + holiday.workingDays, 0);
      const remainingDays = user[0].holidayAllowance - totalUsedDays;

      if (workingDays > remainingDays) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Giorni di ferie insufficienti. Disponibili: ${remainingDays}, richiesti: ${workingDays}`,
            code: 'INSUFFICIENT_ALLOWANCE',
            details: {
              requested: workingDays,
              available: remainingDays,
              total: user[0].holidayAllowance,
              used: totalUsedDays
            }
          })
        };
      }
    }

    // Create holiday request
    const newHoliday = await db
      .insert(holidays)
      .values({
        userId: userToken.userId,
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        type: validatedData.type,
        notes: validatedData.notes || null,
        workingDays,
        status: 'pending', // Always starts as pending
      })
      .returning();

    // Log holiday request creation for audit trail
    const auditLog = {
      timestamp: new Date().toISOString(),
      action: 'holiday_request_created',
      userId: userToken.userId,
      userEmail: userToken.email,
      holidayId: newHoliday[0].id,
      details: {
        startDate: validatedData.startDate,
        endDate: validatedData.endDate,
        type: validatedData.type,
        workingDays,
        notes: validatedData.notes
      }
    };
    console.log('Holiday request created:', JSON.stringify(auditLog));

    // Return success response
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Richiesta di ferie creata con successo',
        holiday: {
          id: newHoliday[0].id,
          startDate: newHoliday[0].startDate,
          endDate: newHoliday[0].endDate,
          type: newHoliday[0].type,
          status: newHoliday[0].status,
          workingDays: newHoliday[0].workingDays,
          notes: newHoliday[0].notes,
          createdAt: newHoliday[0].createdAt
        }
      })
    };

  } catch (error) {
    console.error('Create holiday request error:', error);

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