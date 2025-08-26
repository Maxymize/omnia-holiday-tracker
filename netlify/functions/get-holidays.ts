import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../lib/db/index';
import { holidays, users, departments, settings } from '../../lib/db/schema';
import { eq, and, or, gte, lte, desc, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';

// Query parameters validation schema
const getHolidaysSchema = z.object({
  // Date filtering
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(), // YYYY-MM format
  
  // Status filtering
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  
  // Type filtering
  type: z.enum(['vacation', 'sick', 'personal']).optional(),
  
  // User filtering (admin only)
  userId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  
  // Pagination
  page: z.string().regex(/^\d+$/).default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).default('50').transform(Number),
  
  // Sorting
  sortBy: z.enum(['startDate', 'endDate', 'createdAt', 'status']).default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // View mode (accept both 'view' and 'viewMode' for compatibility)
  view: z.enum(['own', 'team', 'all']).optional(), // own=user's holidays, team=department, all=everyone (admin)
  viewMode: z.enum(['own', 'team', 'all']).optional() // Alternative parameter name for compatibility
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
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Parse and validate query parameters
    const queryParams = event.queryStringParameters || {};
    const validatedParams = getHolidaysSchema.parse(queryParams);

    // Get current user information
    const currentUser = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        departmentId: users.departmentId
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

    // Use viewMode if provided, otherwise fall back to view parameter
    let viewParameter = validatedParams.viewMode || validatedParams.view;
    console.log(`🔍 Initial view parameter: viewMode=${validatedParams.viewMode}, view=${validatedParams.view}, final=${viewParameter}`);

    // If no view parameter is specified and user is not admin, consult system settings
    if (!viewParameter && !isAdmin) {
      try {
        const visibilitySettings = await db
          .select()
          .from(settings)
          .where(eq(settings.key, 'holidays.visibility_mode'))
          .limit(1);

        if (visibilitySettings.length > 0) {
          const visibilityMode = JSON.parse(visibilitySettings[0].value);
          console.log(`🔍 System visibility mode: ${visibilityMode}`);
          
          // Apply system settings logic for employees
          if (visibilityMode === 'all_see_all') {
            viewParameter = 'all';
            console.log(`🔍 System setting: all_see_all -> using view=all`);
          } else if (visibilityMode === 'department_only' && user.departmentId) {
            viewParameter = 'team';
            console.log(`🔍 System setting: department_only -> using view=team`);
          } else {
            viewParameter = 'own';
            console.log(`🔍 System setting: admin_only or no department -> using view=own`);
          }
        } else {
          viewParameter = 'own'; // Default fallback
          console.log(`🔍 No system settings found -> using view=own`);
        }
      } catch (error) {
        console.error('Error reading system settings, defaulting to own view:', error);
        viewParameter = 'own';
      }
    }

    console.log(`🔍 Final view parameter after system settings: ${viewParameter}`);

    // Create alias for approver user
    const approverUser = alias(users, 'approverUser');

    // Build base query
    let query: any = db
      .select({
        holiday: holidays,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          departmentId: users.departmentId
        },
        department: {
          id: departments.id,
          name: departments.name,
          location: departments.location
        },
        approver: {
          id: approverUser.id,
          name: approverUser.name,
          email: approverUser.email
        }
      })
      .from(holidays)
      .innerJoin(users, eq(holidays.userId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(approverUser, eq(holidays.approvedBy, approverUser.id)); // Join for approver info

    // Apply access control based on user role and view parameter
    const conditions: any[] = [];

    if (!isAdmin) {
      // Non-admin users: apply role-based filtering based on system settings
      if (viewParameter === 'all') {
        // Show all employees (system setting: all_see_all)
        // Only show approved holidays for others (privacy)
        conditions.push(
          or(
            eq(holidays.userId, user.id), // Own holidays (any status)
            eq(holidays.status, 'approved') // Others' approved holidays only
          )
        );
      } else if (viewParameter === 'team' && user.departmentId) {
        // Show department colleagues (system setting: department_only)
        conditions.push(eq(users.departmentId, user.departmentId));
        // Only show approved holidays for colleagues (privacy)
        conditions.push(
          or(
            eq(holidays.userId, user.id), // Own holidays (any status)
            eq(holidays.status, 'approved') // Colleagues' approved holidays only
          )
        );
      } else {
        // Default: show only own holidays (system setting: admin_only or fallback)
        conditions.push(eq(holidays.userId, user.id));
      }
    } else {
      // Admin users: can see based on view parameter
      if (viewParameter === 'own') {
        conditions.push(eq(holidays.userId, user.id));
      } else if (viewParameter === 'team' && user.departmentId) {
        conditions.push(eq(users.departmentId, user.departmentId));
      }
      // If view === 'all' or undefined, show all holidays (no additional conditions)
    }

    // Apply additional filters
    if (validatedParams.userId && isAdmin) {
      conditions.push(eq(holidays.userId, validatedParams.userId));
    }

    if (validatedParams.departmentId && isAdmin) {
      conditions.push(eq(users.departmentId, validatedParams.departmentId));
    }

    if (validatedParams.status) {
      conditions.push(eq(holidays.status, validatedParams.status));
    }

    if (validatedParams.type) {
      conditions.push(eq(holidays.type, validatedParams.type));
    }

    // Date filtering
    if (validatedParams.startDate) {
      conditions.push(gte(holidays.startDate, validatedParams.startDate));
    }

    if (validatedParams.endDate) {
      conditions.push(lte(holidays.endDate, validatedParams.endDate));
    }

    if (validatedParams.year) {
      const yearStart = `${validatedParams.year}-01-01`;
      const yearEnd = `${validatedParams.year}-12-31`;
      conditions.push(
        and(
          gte(holidays.startDate, yearStart),
          lte(holidays.startDate, yearEnd)
        )
      );
    }

    if (validatedParams.month) {
      const [year, month] = validatedParams.month.split('-');
      const monthStart = `${year}-${month}-01`;
      const nextMonth = new Date(parseInt(year), parseInt(month), 1);
      const monthEnd = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 0)
        .toISOString().split('T')[0];
      
      conditions.push(
        and(
          gte(holidays.startDate, monthStart),
          lte(holidays.startDate, monthEnd)
        )
      );
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = validatedParams.sortBy === 'startDate' ? holidays.startDate :
                      validatedParams.sortBy === 'endDate' ? holidays.endDate :
                      validatedParams.sortBy === 'createdAt' ? holidays.createdAt :
                      holidays.status;

    const sortFunction = validatedParams.sortOrder === 'asc' ? asc : desc;
    query = query.orderBy(sortFunction(sortColumn));

    // Apply pagination
    const offset = (validatedParams.page - 1) * validatedParams.limit;
    query = query.limit(validatedParams.limit).offset(offset);

    // Execute query
    const results = await query;

    // Get total count for pagination (with same filters)
    let countQuery: any = db
      .select({ count: holidays.id })
      .from(holidays)
      .innerJoin(users, eq(holidays.userId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id));

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const countResult = await countQuery;
    const totalCount = countResult.length;

    // Transform results
    const holidaysData = results.map((result: any) => ({
      id: result.holiday.id,
      userId: result.holiday.userId,
      employeeId: result.holiday.userId, // Calendar compatibility
      employeeName: result.user.name, // Calendar compatibility 
      employeeEmail: isAdmin ? result.user.email : undefined, // Calendar compatibility
      user: {
        id: result.user.id,
        name: result.user.name,
        email: isAdmin ? result.user.email : undefined, // Hide email for non-admin
        department: result.department ? {
          id: result.department.id,
          name: result.department.name,
          location: result.department.location
        } : null
      },
      startDate: result.holiday.startDate,
      endDate: result.holiday.endDate,
      type: result.holiday.type,
      status: result.holiday.status,
      workingDays: result.holiday.workingDays,
      notes: result.holiday.notes,
      approver: result.approver ? {
        id: result.approver.id,
        name: result.approver.name,
        email: isAdmin ? result.approver.email : undefined
      } : null,
      approvedBy: result.holiday.approvedBy, // Calendar compatibility
      approvedAt: result.holiday.approvedAt,
      rejectionReason: result.holiday.rejectionReason,
      createdAt: result.holiday.createdAt,
      updatedAt: result.holiday.updatedAt
    }));

    // Log access for audit trail
    const accessLog = {
      timestamp: new Date().toISOString(),
      action: 'holidays_accessed',
      userId: userToken.userId,
      userEmail: userToken.email,
      filters: validatedParams,
      resultCount: holidaysData.length,
      view: viewParameter || (isAdmin ? 'all' : 'own')
    };
    console.log('Holidays accessed:', JSON.stringify(accessLog));

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          holidays: holidaysData,
          total: holidaysData.length,
          pending: holidaysData.filter((h: any) => h.status === 'pending').length,
          approved: holidaysData.filter((h: any) => h.status === 'approved').length,
          rejected: holidaysData.filter((h: any) => h.status === 'rejected').length,
          // Enhanced statistics by leave type for flexible system
          byLeaveType: {
            vacation: {
              total: holidaysData.filter((h: any) => h.type === 'vacation').length,
              pending: holidaysData.filter((h: any) => h.type === 'vacation' && h.status === 'pending').length,
              approved: holidaysData.filter((h: any) => h.type === 'vacation' && h.status === 'approved').length,
              rejected: holidaysData.filter((h: any) => h.type === 'vacation' && h.status === 'rejected').length,
              totalDays: holidaysData.filter((h: any) => h.type === 'vacation').reduce((sum: number, h: any) => sum + (h.workingDays || 0), 0)
            },
            personal: {
              total: holidaysData.filter((h: any) => h.type === 'personal').length,
              pending: holidaysData.filter((h: any) => h.type === 'personal' && h.status === 'pending').length,
              approved: holidaysData.filter((h: any) => h.type === 'personal' && h.status === 'approved').length,
              rejected: holidaysData.filter((h: any) => h.type === 'personal' && h.status === 'rejected').length,
              totalDays: holidaysData.filter((h: any) => h.type === 'personal').reduce((sum: number, h: any) => sum + (h.workingDays || 0), 0)
            },
            sick: {
              total: holidaysData.filter((h: any) => h.type === 'sick').length,
              pending: holidaysData.filter((h: any) => h.type === 'sick' && h.status === 'pending').length,
              approved: holidaysData.filter((h: any) => h.type === 'sick' && h.status === 'approved').length,
              rejected: holidaysData.filter((h: any) => h.type === 'sick' && h.status === 'rejected').length,
              totalDays: holidaysData.filter((h: any) => h.type === 'sick').reduce((sum: number, h: any) => sum + (h.workingDays || 0), 0)
            }
          }
        },
        pagination: {
          currentPage: validatedParams.page,
          limit: validatedParams.limit,
          totalCount,
          totalPages: Math.ceil(totalCount / validatedParams.limit),
          hasNext: validatedParams.page * validatedParams.limit < totalCount,
          hasPrevious: validatedParams.page > 1
        },
        filters: {
          applied: validatedParams,
          view: viewParameter || (isAdmin ? 'all' : 'own'),
          userRole: user.role
        }
      })
    };

  } catch (error) {
    console.error('Get holidays error:', error);

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