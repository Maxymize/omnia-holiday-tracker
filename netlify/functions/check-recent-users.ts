import { Handler } from '@netlify/functions';
import { db } from '../../lib/db/index';
import { users } from '../../lib/db/schema';
import { gte, desc } from 'drizzle-orm';

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
    console.log('=== CHECKING RECENT USERS ===');

    // Get users created in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        status: users.status,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(gte(users.createdAt, yesterday))
      .orderBy(desc(users.createdAt));

    console.log('Recent users found:', recentUsers);

    // Also get all users for comparison
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        status: users.status,
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);

    console.log('All users (last 10):', allUsers);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          recentUsers,
          allUsers,
          totalRecentUsers: recentUsers.length,
          checkTime: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Check recent users error:', error);
    
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