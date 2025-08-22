import { Handler } from '@netlify/functions';
import { db } from '../../lib/db/index';
import { users } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

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

  try {
    console.log('=== DEBUG GET USERS ===');
    console.log('Query params:', event.queryStringParameters);

    const statusParam = event.queryStringParameters?.status || 'all';
    
    console.log('Filtering by status:', statusParam);

    // Get users based on status
    let usersQuery;
    
    if (statusParam === 'all') {
      usersQuery = db.select().from(users);
    } else {
      // Cast to the correct enum type
      const validStatuses = ['pending', 'active', 'inactive'] as const;
      type UserStatus = typeof validStatuses[number];
      
      if (validStatuses.includes(statusParam as UserStatus)) {
        usersQuery = db.select().from(users).where(eq(users.status, statusParam as UserStatus));
      } else {
        // Invalid status, return all users
        usersQuery = db.select().from(users);
      }
    }

    const allUsers = await usersQuery;
    
    console.log('Users found:', allUsers.length);
    console.log('Users data:', allUsers);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          users: allUsers,
          total: allUsers.length,
          statusFilter: statusParam,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Debug get users error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};