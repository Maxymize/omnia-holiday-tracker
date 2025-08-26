import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../lib/db/index';
import { holidays, users, departments, auditLogs } from '../../lib/db/schema';
import { eq, and, or, desc, asc, gte, lte, like, ilike } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { verifyAuthHeader, requireAccessToken, requireAdmin } from '../../lib/auth/jwt-utils';

// Activity types that match the frontend interface
export type ActivityType = 'holiday_request' | 'employee_registration' | 'holiday_approved' | 'holiday_rejected';

// Input validation schema for query parameters
const getActivitiesSchema = z.object({
  // Pagination
  page: z.string().regex(/^\d+$/).default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).default('10').transform(Number),
  
  // Sorting
  sortBy: z.enum(['date', 'type', 'user']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Filtering
  type: z.enum(['all', 'holiday_request', 'employee_registration', 'holiday_approved', 'holiday_rejected']).default('all'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  userId: z.string().uuid().optional(),
  search: z.string().optional(), // Search in title, description, user name, email
});

// Activity interface matching frontend expectations
interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  date: string; // ISO date string
  user: {
    name: string;
    email: string;
  };
  status?: string;
  metadata?: {
    resourceId?: string;
    resourceType?: string;
    originalData?: any;
  };
}

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Generate activity from holiday request
 */
function createHolidayRequestActivity(holiday: any, user: any, approver?: any): Activity {
  return {
    id: `holiday_${holiday.id}`,
    type: 'holiday_request',
    title: `Richiesta ferie - ${user.name}`,
    description: `Richiesta ferie dal ${holiday.startDate} al ${holiday.endDate} (${holiday.workingDays} giorni lavorativi)${holiday.notes ? ` - ${holiday.notes}` : ''}`,
    date: holiday.createdAt,
    user: {
      name: user.name,
      email: user.email,
    },
    status: holiday.status,
    metadata: {
      resourceId: holiday.id,
      resourceType: 'holiday',
      originalData: {
        startDate: holiday.startDate,
        endDate: holiday.endDate,
        type: holiday.type,
        workingDays: holiday.workingDays,
        approver: approver ? {
          name: approver.name,
          email: approver.email
        } : null
      }
    }
  };
}

/**
 * Generate activity from holiday approval/rejection
 */
function createHolidayStatusActivity(holiday: any, user: any, approver: any): Activity | null {
  if (!holiday.approvedAt || !approver) return null;
  
  const isApproved = holiday.status === 'approved';
  const actionType = isApproved ? 'holiday_approved' : 'holiday_rejected';
  const actionText = isApproved ? 'approvate' : 'rifiutate';
  
  return {
    id: `holiday_${actionType}_${holiday.id}`,
    type: actionType,
    title: `Ferie ${actionText} - ${user.name}`,
    description: `Le ferie dal ${holiday.startDate} al ${holiday.endDate} sono state ${actionText} da ${approver.name}${holiday.rejectionReason ? ` - Motivo: ${holiday.rejectionReason}` : ''}`,
    date: holiday.approvedAt,
    user: {
      name: user.name,
      email: user.email,
    },
    status: holiday.status,
    metadata: {
      resourceId: holiday.id,
      resourceType: 'holiday',
      originalData: {
        startDate: holiday.startDate,
        endDate: holiday.endDate,
        approver: {
          name: approver.name,
          email: approver.email
        },
        rejectionReason: holiday.rejectionReason
      }
    }
  };
}

/**
 * Generate activity from employee registration
 */
function createEmployeeRegistrationActivity(user: any, department?: any): Activity {
  return {
    id: `employee_${user.id}`,
    type: 'employee_registration',
    title: `Nuovo dipendente registrato - ${user.name}`,
    description: `${user.name} (${user.email}) si è registrato${department ? ` per il dipartimento ${department.name}` : ''}${user.status === 'pending' ? ' - In attesa di approvazione' : ''}`,
    date: user.createdAt,
    user: {
      name: user.name,
      email: user.email,
    },
    status: user.status,
    metadata: {
      resourceId: user.id,
      resourceType: 'user',
      originalData: {
        role: user.role,
        department: department ? {
          id: department.id,
          name: department.name,
          location: department.location
        } : null,
        holidayAllowance: user.holidayAllowance
      }
    }
  };
}

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
    // Verify authentication and require admin access
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);
    requireAdmin(userToken);

    // Parse and validate query parameters
    const queryParams = event.queryStringParameters || {};
    const validatedParams = getActivitiesSchema.parse(queryParams);

    console.log(`🔍 Get Activities Request:`, {
      userId: userToken.userId,
      params: validatedParams,
      timestamp: new Date().toISOString()
    });

    // Collect all activities from different sources
    const activities: Activity[] = [];

    // 1. Get holiday request activities
    const approverUser = alias(users, 'approverUser');
    
    let holidayQuery: any = db
      .select({
        holiday: holidays,
        user: {
          id: users.id,
          name: users.name,
          email: users.email
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
      .leftJoin(approverUser, eq(holidays.approvedBy, approverUser.id));

    // Apply date filters for holidays
    const holidayConditions: any[] = [];
    if (validatedParams.startDate) {
      holidayConditions.push(gte(holidays.createdAt, new Date(validatedParams.startDate + 'T00:00:00.000Z')));
    }
    if (validatedParams.endDate) {
      holidayConditions.push(lte(holidays.createdAt, new Date(validatedParams.endDate + 'T23:59:59.999Z')));
    }
    if (validatedParams.userId) {
      holidayConditions.push(eq(holidays.userId, validatedParams.userId));
    }

    if (holidayConditions.length > 0) {
      holidayQuery = holidayQuery.where(and(...holidayConditions));
    }

    const holidayResults = await holidayQuery.orderBy(desc(holidays.createdAt));

    // Process holiday results into activities
    for (const result of holidayResults) {
      // Add holiday request activity (always created when holiday is created)
      if (validatedParams.type === 'all' || validatedParams.type === 'holiday_request') {
        const requestActivity = createHolidayRequestActivity(result.holiday, result.user, result.approver);
        activities.push(requestActivity);
      }

      // Add holiday approval/rejection activity if it exists
      if (result.holiday.approvedAt && result.approver && 
          (validatedParams.type === 'all' || 
           validatedParams.type === 'holiday_approved' || 
           validatedParams.type === 'holiday_rejected')) {
        const statusActivity = createHolidayStatusActivity(result.holiday, result.user, result.approver);
        if (statusActivity) {
          activities.push(statusActivity);
        }
      }
    }

    // 2. Get employee registration activities
    if (validatedParams.type === 'all' || validatedParams.type === 'employee_registration') {
      let employeeQuery: any = db
        .select({
          user: users,
          department: {
            id: departments.id,
            name: departments.name,
            location: departments.location
          }
        })
        .from(users)
        .leftJoin(departments, eq(users.departmentId, departments.id));

      // Apply filters for employees
      const employeeConditions: any[] = [];
      if (validatedParams.startDate) {
        employeeConditions.push(gte(users.createdAt, new Date(validatedParams.startDate + 'T00:00:00.000Z')));
      }
      if (validatedParams.endDate) {
        employeeConditions.push(lte(users.createdAt, new Date(validatedParams.endDate + 'T23:59:59.999Z')));
      }
      if (validatedParams.userId) {
        employeeConditions.push(eq(users.id, validatedParams.userId));
      }

      if (employeeConditions.length > 0) {
        employeeQuery = employeeQuery.where(and(...employeeConditions));
      }

      const employeeResults = await employeeQuery.orderBy(desc(users.createdAt));

      for (const result of employeeResults) {
        const registrationActivity = createEmployeeRegistrationActivity(result.user, result.department);
        activities.push(registrationActivity);
      }
    }

    // Apply search filter if provided
    let filteredActivities = activities;
    if (validatedParams.search) {
      const searchTerm = validatedParams.search.toLowerCase();
      filteredActivities = activities.filter(activity =>
        activity.title.toLowerCase().includes(searchTerm) ||
        activity.description.toLowerCase().includes(searchTerm) ||
        activity.user.name.toLowerCase().includes(searchTerm) ||
        activity.user.email.toLowerCase().includes(searchTerm)
      );
    }

    // Sort activities
    filteredActivities.sort((a, b) => {
      let comparison = 0;
      
      switch (validatedParams.sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'user':
          comparison = a.user.name.localeCompare(b.user.name);
          break;
      }
      
      return validatedParams.sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const totalCount = filteredActivities.length;
    const totalPages = Math.ceil(totalCount / validatedParams.limit);
    const offset = (validatedParams.page - 1) * validatedParams.limit;
    const paginatedActivities = filteredActivities.slice(offset, offset + validatedParams.limit);

    // Generate statistics
    const stats = {
      total: totalCount,
      byType: {
        holiday_request: filteredActivities.filter(a => a.type === 'holiday_request').length,
        employee_registration: filteredActivities.filter(a => a.type === 'employee_registration').length,
        holiday_approved: filteredActivities.filter(a => a.type === 'holiday_approved').length,
        holiday_rejected: filteredActivities.filter(a => a.type === 'holiday_rejected').length,
      },
      byStatus: {
        pending: filteredActivities.filter(a => a.status === 'pending').length,
        approved: filteredActivities.filter(a => a.status === 'approved').length,
        rejected: filteredActivities.filter(a => a.status === 'rejected').length,
        active: filteredActivities.filter(a => a.status === 'active').length,
      }
    };

    // Log access for audit trail
    const accessLog = {
      timestamp: new Date().toISOString(),
      action: 'activities_accessed',
      userId: userToken.userId,
      userEmail: userToken.email,
      filters: validatedParams,
      resultCount: paginatedActivities.length,
      totalCount
    };
    console.log('Activities accessed:', JSON.stringify(accessLog));

    // Return paginated response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          activities: paginatedActivities,
          statistics: stats
        },
        pagination: {
          currentPage: validatedParams.page,
          totalPages,
          totalCount,
          limit: validatedParams.limit,
          hasNext: validatedParams.page < totalPages,
          hasPrevious: validatedParams.page > 1,
          startIndex: offset + 1,
          endIndex: Math.min(offset + validatedParams.limit, totalCount)
        },
        filters: {
          applied: validatedParams,
          availableTypes: ['all', 'holiday_request', 'employee_registration', 'holiday_approved', 'holiday_rejected']
        }
      })
    };

  } catch (error) {
    console.error('Get activities error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Handle admin access errors
    if (error instanceof Error && error.message.includes('Admin')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Accesso negato: solo gli amministratori possono visualizzare le attività' })
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