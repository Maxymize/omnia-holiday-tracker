import { Handler } from '@netlify/functions';
import { db } from '../../lib/db';
import { users, holidays, departments } from '../../lib/db/schema';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Count all records
    const usersCount = await db.select().from(users);
    const holidaysCount = await db.select().from(holidays);
    const departmentsCount = await db.select().from(departments);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        counts: {
          users: usersCount.length,
          holidays: holidaysCount.length,
          departments: departmentsCount.length
        },
        users: usersCount.map(u => ({ id: u.id, email: u.email, name: u.name, status: u.status, role: u.role })),
        holidays: holidaysCount.map(h => ({ 
          id: h.id, 
          userId: h.userId, 
          startDate: h.startDate, 
          endDate: h.endDate 
        })),
        departments: departmentsCount.map(d => ({ 
          id: d.id, 
          name: d.name, 
          managerId: d.managerId 
        }))
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};