import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../lib/db/index';
import { holidays, users } from '../../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';
import { getLeaveTypeAllowances } from '../../lib/db/operations';

// Input validation schema
const getLeaveStatsSchema = z.object({
  userId: z.string().uuid().optional(), // For admin to check other users
  year: z.string().regex(/^\d{4}$/).optional(),
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Verify authentication
    const userToken = await verifyAuthFromRequest(event);
    requireAccessToken(userToken);

    // Parse and validate query parameters
    const queryParams = event.queryStringParameters || {};
    const validatedParams = getLeaveStatsSchema.parse(queryParams);

    // Get current user information
    const currentUser = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userToken.userId))
      .limit(1);

    if (!currentUser[0]) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Utente non trovato' })
      };
    }

    const user = currentUser[0];
    const isAdmin = user.role === 'admin';

    // Determine target user (admin can check others, employees only themselves)
    const targetUserId = validatedParams.userId && isAdmin 
      ? validatedParams.userId 
      : userToken.userId;

    // Get flexible leave type allowances from system settings
    const leaveAllowances = await getLeaveTypeAllowances();

    // Get current year or specified year
    const currentYear = validatedParams.year 
      ? parseInt(validatedParams.year, 10)
      : new Date().getFullYear();

    // Fetch all holidays for the target user in the specified year
    const userHolidays = await db
      .select({
        id: holidays.id,
        type: holidays.type,
        status: holidays.status,
        workingDays: holidays.workingDays,
        startDate: holidays.startDate,
        endDate: holidays.endDate,
        createdAt: holidays.createdAt
      })
      .from(holidays)
      .where(
        and(
          eq(holidays.userId, targetUserId),
          // Filter by year based on start date
          ...(validatedParams.year ? [] : []) // Add year filter if needed
        )
      );

    // Filter holidays for the specified year
    const yearHolidays = userHolidays.filter(holiday => {
      const startDate = new Date(holiday.startDate);
      return startDate.getFullYear() === currentYear;
    });

    // Calculate today's date for past/future distinction
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate statistics by leave type
    const calculateStatsForType = (type: 'vacation' | 'sick' | 'personal') => {
      const typeHolidays = yearHolidays.filter(h => h.type === type);
      const approvedHolidays = typeHolidays.filter(h => h.status === 'approved');
      
      // Days already taken (end date is in the past)
      const takenDays = approvedHolidays
        .filter(h => new Date(h.endDate) < today)
        .reduce((sum, h) => sum + h.workingDays, 0);

      // Days booked for future (start date is today or in the future)  
      const bookedDays = approvedHolidays
        .filter(h => new Date(h.startDate) >= today)
        .reduce((sum, h) => sum + h.workingDays, 0);

      // Total approved days
      const usedDays = takenDays + bookedDays;

      // Pending days
      const pendingDays = typeHolidays
        .filter(h => h.status === 'pending')
        .reduce((sum, h) => sum + h.workingDays, 0);

      // Get allowance from flexible system settings
      const allowance = type === 'vacation' ? leaveAllowances.vacation :
                       type === 'personal' ? leaveAllowances.personal :
                       leaveAllowances.sick; // -1 = unlimited

      // Calculate available days
      const availableDays = allowance === -1 
        ? -1 // unlimited for sick days
        : Math.max(0, allowance - usedDays - pendingDays);

      return {
        type,
        allowance,
        usedDays,
        takenDays,
        bookedDays,
        pendingDays,
        availableDays,
        totalRequests: typeHolidays.length,
        approvedRequests: approvedHolidays.length,
        pendingRequests: typeHolidays.filter(h => h.status === 'pending').length,
        rejectedRequests: typeHolidays.filter(h => h.status === 'rejected').length,
        upcomingRequests: approvedHolidays.filter(h => new Date(h.startDate) > today).length
      };
    };

    // Calculate stats for all leave types
    const vacationStats = calculateStatsForType('vacation');
    const personalStats = calculateStatsForType('personal');
    const sickStats = calculateStatsForType('sick');

    // Overall summary (for backward compatibility)
    const totalUsedDays = vacationStats.usedDays + personalStats.usedDays;
    const totalPendingDays = vacationStats.pendingDays + personalStats.pendingDays;
    const totalAllowance = leaveAllowances.vacation + leaveAllowances.personal; // exclude sick as it can be unlimited

    // Log access for audit trail
    const accessLog = {
      timestamp: new Date().toISOString(),
      action: 'leave_stats_accessed',
      userId: userToken.userId,
      userEmail: userToken.email,
      targetUserId: targetUserId,
      year: currentYear,
      isAdmin: isAdmin
    };
    console.log('Leave stats accessed:', JSON.stringify(accessLog));

    // Return flexible leave type statistics
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          year: currentYear,
          leaveTypes: {
            vacation: vacationStats,
            personal: personalStats,
            sick: sickStats
          },
          // Legacy format for backward compatibility
          summary: {
            totalAllowance,
            totalUsedDays,
            totalPendingDays,
            totalAvailableDays: Math.max(0, totalAllowance - totalUsedDays - totalPendingDays)
          }
        }
      })
    };

  } catch (error) {
    console.error('Get leave stats error:', error);

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
          error: 'Parametri non validi', 
          details: error.issues?.map(e => `${e.path.join('.')}: ${e.message}`)
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