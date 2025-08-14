import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { db, users, departments, holidays } from '../../lib/db/index';
import { eq, sql, desc, and } from 'drizzle-orm';

// Mock employee data for development
const mockEmployees = [
  {
    id: 'e1',
    name: 'Mario Rossi',
    email: 'mario.rossi@ominiaservice.net',
    role: 'employee',
    status: 'active',
    department: 'dept1',
    departmentName: 'IT Development',
    holidayAllowance: 25,
    holidaysUsed: 5,
    holidaysRemaining: 20,
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: '2024-01-05T09:00:00.000Z'
  },
  {
    id: 'e2',
    name: 'Giulia Bianchi',
    email: 'giulia.bianchi@ominiaservice.net',
    role: 'employee',
    status: 'active',
    department: 'dept2',
    departmentName: 'Marketing',
    holidayAllowance: 25,
    holidaysUsed: 8,
    holidaysRemaining: 17,
    createdAt: '2024-01-02T00:00:00.000Z',
    lastLogin: '2024-01-05T10:30:00.000Z'
  },
  {
    id: 'e3',
    name: 'Luca Verdi',
    email: 'luca.verdi@ominiaservice.net',
    role: 'employee',
    status: 'pending',
    department: 'dept1',
    departmentName: 'IT Development',
    holidayAllowance: 25,
    holidaysUsed: 0,
    holidaysRemaining: 25,
    createdAt: '2024-01-05T00:00:00.000Z',
    lastLogin: null
  }
];

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

    // Check if user is admin
    if (userToken.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Accesso negato: privilegi amministratore richiesti' })
      };
    }

    console.log('Employees accessed by admin:', userToken.email);

    // Get all employees from database with their holiday usage
    const employeesData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        departmentId: users.departmentId,
        departmentName: departments.name,
        departmentLocation: departments.location,
        holidayAllowance: users.holidayAllowance,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .orderBy(desc(users.createdAt));

    // Calculate holidays used for each employee
    const employeesWithHolidayStats = await Promise.all(
      employeesData.map(async (employee) => {
        // Get approved holidays for this employee in current year
        const currentYear = new Date().getFullYear();
        const yearStart = `${currentYear}-01-01`;
        const yearEnd = `${currentYear}-12-31`;

        const holidayStats = await db
          .select({
            totalUsed: sql<number>`COALESCE(SUM(${holidays.workingDays}), 0)`,
            totalPending: sql<number>`COALESCE(SUM(CASE WHEN ${holidays.status} = 'pending' THEN ${holidays.workingDays} ELSE 0 END), 0)`
          })
          .from(holidays)
          .where(
            and(
              eq(holidays.userId, employee.id),
              // Only count holidays in current year
              sql`${holidays.startDate} >= ${yearStart} AND ${holidays.startDate} <= ${yearEnd}`,
              // Only count approved or pending holidays
              sql`${holidays.status} IN ('approved', 'pending')`
            )
          );

        const stats = holidayStats[0];
        const holidaysUsed = Number(stats?.totalUsed) || 0;
        const holidaysPending = Number(stats?.totalPending) || 0;
        const holidaysRemaining = Math.max(0, employee.holidayAllowance - holidaysUsed - holidaysPending);

        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          status: employee.status,
          department: employee.departmentId,
          departmentName: employee.departmentName || 'Non assegnato',
          departmentLocation: employee.departmentLocation,
          holidayAllowance: employee.holidayAllowance,
          holidaysUsed,
          holidaysPending,
          holidaysRemaining,
          createdAt: employee.createdAt.toISOString(),
          updatedAt: employee.updatedAt?.toISOString(),
          lastLogin: null // TODO: Implement last login tracking
        };
      })
    );

    // Return employee data from database
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          employees: employeesWithHolidayStats,
          total: employeesWithHolidayStats.length,
          active: employeesWithHolidayStats.filter(e => e.status === 'active').length,
          pending: employeesWithHolidayStats.filter(e => e.status === 'pending').length,
          inactive: employeesWithHolidayStats.filter(e => e.status === 'inactive').length
        }
      })
    };

  } catch (error) {
    console.error('Get employees mock error:', error);

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