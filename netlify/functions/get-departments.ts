import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../lib/db/index';
import { departments, users } from '../../lib/db/schema';
import { eq, count, desc, asc, and, inArray } from 'drizzle-orm';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';

// Query parameters validation schema
const getDepartmentsSchema = z.object({
  // Include employee details
  includeEmployees: z.enum(['true', 'false']).default('false').transform(val => val === 'true'),
  
  // Include employee count
  includeCount: z.enum(['true', 'false']).default('true').transform(val => val === 'true'),
  
  // Include manager details
  includeManager: z.enum(['true', 'false']).default('true').transform(val => val === 'true'),
  
  // Filtering
  managerId: z.string().uuid().optional(),
  location: z.string().optional(),
  
  // Sorting
  sortBy: z.enum(['name', 'location', 'employeeCount', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  
  // Pagination
  page: z.string().regex(/^\d+$/).default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).default('50').transform(Number)
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
    const validatedParams = getDepartmentsSchema.parse(queryParams);

    // Get current user information for access control
    const currentUser = await db
      .select({
        id: users.id,
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

    // Base query for departments with manager info
    let departmentsQuery;
    
    if (validatedParams.includeManager) {
      departmentsQuery = db
        .select({
          department: departments,
          manager: {
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role
          }
        })
        .from(departments)
        .leftJoin(users, eq(departments.managerId, users.id));
    } else {
      departmentsQuery = db
        .select({
          department: departments
        })
        .from(departments);
    }

    // Apply filters
    const conditions: any[] = [];

    if (validatedParams.managerId) {
      conditions.push(eq(departments.managerId, validatedParams.managerId));
    }

    if (validatedParams.location) {
      conditions.push(eq(departments.location, validatedParams.location));
    }

    // Apply conditions if any
    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      departmentsQuery = departmentsQuery.where(whereCondition);
    }

    // Apply pagination
    const offset = (validatedParams.page - 1) * validatedParams.limit;
    departmentsQuery = departmentsQuery.limit(validatedParams.limit).offset(offset);

    // Execute departments query
    const departmentsResult = await departmentsQuery;

    // Get employee counts for each department if requested
    const departmentEmployeeCounts = new Map();
    if (validatedParams.includeCount && departmentsResult.length > 0) {
      const departmentIds = departmentsResult.map(d => d.department.id);
      
      const employeeCountsQuery = await db
        .select({
          departmentId: users.departmentId,
          count: count(users.id)
        })
        .from(users)
        .where(inArray(users.departmentId, departmentIds))
        .groupBy(users.departmentId);

      employeeCountsQuery.forEach(row => {
        if (row.departmentId) {
          departmentEmployeeCounts.set(row.departmentId, row.count);
        }
      });
    }

    // Get employees for each department if requested
    const departmentEmployees = new Map();
    if (validatedParams.includeEmployees && departmentsResult.length > 0) {
      const departmentIds = departmentsResult.map(d => d.department.id);
      
      let employeesQuery;
      
      if (isAdmin) {
        employeesQuery = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            status: users.status,
            departmentId: users.departmentId,
            holidayAllowance: users.holidayAllowance,
            createdAt: users.createdAt
          })
          .from(users)
          .where(inArray(users.departmentId, departmentIds))
          .orderBy(asc(users.name));
      } else {
        employeesQuery = await db
          .select({
            id: users.id,
            name: users.name,
            role: users.role,
            status: users.status,
            departmentId: users.departmentId,
            holidayAllowance: users.holidayAllowance,
            createdAt: users.createdAt
          })
          .from(users)
          .where(inArray(users.departmentId, departmentIds))
          .orderBy(asc(users.name));
      }

      // Group employees by department
      employeesQuery.forEach(employee => {
        if (employee.departmentId) {
          if (!departmentEmployees.has(employee.departmentId)) {
            departmentEmployees.set(employee.departmentId, []);
          }
          departmentEmployees.get(employee.departmentId).push(employee);
        }
      });
    }

    // Transform results
    let departmentsData = departmentsResult.map(result => {
      const baseData = {
        id: result.department.id,
        name: result.department.name,
        location: result.department.location,
        employeeCount: validatedParams.includeCount ? 
          (departmentEmployeeCounts.get(result.department.id) || 0) : 
          undefined,
        employees: validatedParams.includeEmployees ? 
          (departmentEmployees.get(result.department.id) || []) : 
          undefined,
        createdAt: result.department.createdAt,
        updatedAt: result.department.updatedAt
      };

      // Add manager info if included in query
      if (validatedParams.includeManager) {
        return {
          ...baseData,
          manager: (result as any).manager ? {
            id: (result as any).manager.id,
            name: (result as any).manager.name,
            email: isAdmin ? (result as any).manager.email : undefined,
            role: (result as any).manager.role
          } : null
        };
      } else {
        return {
          ...baseData,
          manager: undefined
        };
      }
    });

    // Apply sorting (since we can't easily sort with joins in the query)
    if (validatedParams.sortBy === 'employeeCount' && validatedParams.includeCount) {
      departmentsData.sort((a, b) => {
        const aCount = a.employeeCount || 0;
        const bCount = b.employeeCount || 0;
        return validatedParams.sortOrder === 'asc' ? aCount - bCount : bCount - aCount;
      });
    } else if (validatedParams.sortBy === 'name') {
      departmentsData.sort((a, b) => {
        const result = a.name.localeCompare(b.name);
        return validatedParams.sortOrder === 'asc' ? result : -result;
      });
    } else if (validatedParams.sortBy === 'location') {
      departmentsData.sort((a, b) => {
        const aLoc = a.location || '';
        const bLoc = b.location || '';
        const result = aLoc.localeCompare(bLoc);
        return validatedParams.sortOrder === 'asc' ? result : -result;
      });
    } else if (validatedParams.sortBy === 'createdAt') {
      departmentsData.sort((a, b) => {
        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();
        return validatedParams.sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      });
    }

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count(departments.id) })
      .from(departments);
    
    const totalCount = totalCountResult[0]?.count || 0;

    // Log access for audit trail
    const accessLog = {
      timestamp: new Date().toISOString(),
      action: 'departments_accessed',
      userId: userToken.userId,
      userEmail: userToken.email,
      userRole: user.role,
      filters: validatedParams,
      resultCount: departmentsData.length
    };
    console.log('Departments accessed:', JSON.stringify(accessLog));

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        departments: departmentsData,
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
          userRole: user.role
        },
        summary: {
          totalDepartments: totalCount,
          totalEmployees: validatedParams.includeCount ? 
            Array.from(departmentEmployeeCounts.values()).reduce((a, b) => a + b, 0) : 
            undefined
        }
      })
    };

  } catch (error) {
    console.error('Get departments error:', error);

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