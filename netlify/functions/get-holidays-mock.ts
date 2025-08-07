import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';

// Mock holiday data for development - Updated with overlapping holidays
const mockHolidays = [
  // August holidays - current month
  {
    id: 'h1',
    employeeId: 'e1',
    employeeName: 'Mario Rossi',
    employeeEmail: 'mario.rossi@ominiaservice.net',
    department: 'IT Development',
    startDate: '2025-08-15',
    endDate: '2025-08-19',
    workingDays: 5,
    type: 'vacation',
    status: 'pending',
    notes: 'Vacanze estive',
    createdAt: '2025-08-01T10:00:00.000Z'
  },
  {
    id: 'h2',
    employeeId: 'e2',
    employeeName: 'Giulia Bianchi',
    employeeEmail: 'giulia.bianchi@ominiaservice.net',
    department: 'Marketing',
    startDate: '2025-08-22',
    endDate: '2025-08-26',
    workingDays: 5,
    type: 'vacation',
    status: 'approved',
    notes: 'Ferie estive',
    createdAt: '2025-08-05T14:30:00.000Z'
  },
  {
    id: 'h3',
    employeeId: 'e1',
    employeeName: 'Mario Rossi',
    employeeEmail: 'mario.rossi@ominiaservice.net',
    department: 'IT Development',
    startDate: '2025-08-08',
    endDate: '2025-08-08',
    workingDays: 1,
    type: 'sick',
    status: 'approved',
    notes: 'Malattia',
    createdAt: '2025-08-08T08:00:00.000Z'
  },

  // OVERLAPPING HOLIDAYS - Same period for testing (August 25-29)
  {
    id: 'h4',
    employeeId: 'e3',
    employeeName: 'Luca Verdi',
    employeeEmail: 'luca.verdi@ominiaservice.net',
    department: 'Sales',
    startDate: '2025-08-25',
    endDate: '2025-08-29',
    workingDays: 5,
    type: 'vacation',
    status: 'approved',
    notes: 'Fine agosto - Primo gruppo',
    createdAt: '2025-08-10T12:00:00.000Z'
  },
  {
    id: 'h5',
    employeeId: 'e4',
    employeeName: 'Anna Neri',
    employeeEmail: 'anna.neri@ominiaservice.net',
    department: 'HR',
    startDate: '2025-08-26',
    endDate: '2025-08-30',
    workingDays: 5,
    type: 'vacation',
    status: 'approved',
    notes: 'Fine agosto - Secondo gruppo',
    createdAt: '2025-08-11T09:00:00.000Z'
  },
  {
    id: 'h6',
    employeeId: 'e5',
    employeeName: 'Paolo Blu',
    employeeEmail: 'paolo.blu@ominiaservice.net',
    department: 'Operations',
    startDate: '2025-08-27',
    endDate: '2025-08-29',
    workingDays: 3,
    type: 'vacation',
    status: 'pending',
    notes: 'Fine agosto - Terzo gruppo',
    createdAt: '2025-08-12T15:00:00.000Z'
  },

  // July-August overlap
  {
    id: 'h7',
    employeeId: 'e6',
    employeeName: 'Sofia Rosa',
    employeeEmail: 'sofia.rosa@ominiaservice.net',
    department: 'Design',
    startDate: '2025-07-29',
    endDate: '2025-08-02',
    workingDays: 5,
    type: 'vacation',
    status: 'approved',
    notes: 'Ponte fine luglio',
    createdAt: '2025-07-15T09:00:00.000Z'
  },

  // September holidays
  {
    id: 'h8',
    employeeId: 'e7',
    employeeName: 'Marco Giallo',
    employeeEmail: 'marco.giallo@ominiaservice.net',
    department: 'Finance',
    startDate: '2025-09-02',
    endDate: '2025-09-06',
    workingDays: 5,
    type: 'vacation',
    status: 'approved',
    notes: 'Prima settimana settembre',
    createdAt: '2025-08-20T11:00:00.000Z'
  },
  {
    id: 'h9',
    employeeId: 'e8',
    employeeName: 'Elena Viola',
    employeeEmail: 'elena.viola@ominiaservice.net',
    department: 'Customer Service',
    startDate: '2025-09-15',
    endDate: '2025-09-19',
    workingDays: 5,
    type: 'vacation',
    status: 'pending',
    notes: 'Metà settembre',
    createdAt: '2025-08-28T14:00:00.000Z'
  },

  // More overlapping in July for previous month testing
  {
    id: 'h10',
    employeeId: 'e9',
    employeeName: 'Andrea Verde',
    employeeEmail: 'andrea.verde@ominiaservice.net',
    department: 'Legal',
    startDate: '2025-07-14',
    endDate: '2025-07-18',
    workingDays: 5,
    type: 'vacation',
    status: 'approved',
    notes: 'Metà luglio',
    createdAt: '2025-07-01T10:00:00.000Z'
  },
  {
    id: 'h11',
    employeeId: 'e10',
    employeeName: 'Chiara Arancio',
    employeeEmail: 'chiara.arancio@ominiaservice.net',
    department: 'R&D',
    startDate: '2025-07-16',
    endDate: '2025-07-17',
    workingDays: 2,
    type: 'personal',
    status: 'approved',
    notes: 'Giorni personali',
    createdAt: '2025-07-05T16:00:00.000Z'
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

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const status = queryParams.status;
    const viewMode = queryParams.viewMode || 'own';
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;

    let filteredHolidays = mockHolidays;

    // Filter by date range if provided
    if (startDate && endDate) {
      const filterStart = new Date(startDate);
      const filterEnd = new Date(endDate);
      
      filteredHolidays = filteredHolidays.filter(holiday => {
        const holidayStart = new Date(holiday.startDate);
        const holidayEnd = new Date(holiday.endDate);
        
        // Include holidays that overlap with the requested range
        return (
          (holidayStart >= filterStart && holidayStart <= filterEnd) ||
          (holidayEnd >= filterStart && holidayEnd <= filterEnd) ||
          (holidayStart <= filterStart && holidayEnd >= filterEnd)
        );
      });
    }

    // Filter by status if provided
    if (status) {
      filteredHolidays = filteredHolidays.filter(h => h.status === status);
    }

    // Apply view mode filtering for non-admin users
    if (userToken.role !== 'admin' && viewMode !== 'all') {
      filteredHolidays = filteredHolidays.filter(h => h.employeeId === userToken.userId);
    }

    console.log('Mock holidays accessed by:', userToken.email, 'filters:', { status, viewMode });

    // Return mock holiday data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          holidays: filteredHolidays,
          total: filteredHolidays.length,
          pending: mockHolidays.filter(h => h.status === 'pending').length,
          approved: mockHolidays.filter(h => h.status === 'approved').length,
          rejected: mockHolidays.filter(h => h.status === 'rejected').length
        }
      })
    };

  } catch (error) {
    console.error('Get holidays mock error:', error);

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