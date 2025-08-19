import { Handler } from '@netlify/functions';
import { db } from '../../lib/db';
import { users } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { employeeId, departmentId } = body;

    if (!employeeId || !departmentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Employee ID and Department ID are required' })
      };
    }

    // Update employee to assign to department
    const updatedEmployee = await db.update(users)
      .set({ 
        departmentId: departmentId,
        updatedAt: new Date()
      })
      .where(eq(users.id, employeeId))
      .returning();

    if (updatedEmployee.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Employee not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Employee successfully assigned to department',
        employee: updatedEmployee[0]
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