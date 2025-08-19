import { Handler } from '@netlify/functions';
import { db } from '../../lib/db';
import { departments, users } from '../../lib/db/schema';
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

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { departmentId } = event.queryStringParameters || {};

    if (!departmentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Department ID is required' })
      };
    }

    // Check if department has employees
    const employeesInDept = await db.select()
      .from(users)
      .where(eq(users.departmentId, departmentId))
      .limit(1);

    if (employeesInDept.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Cannot delete department with assigned employees',
          employeeCount: employeesInDept.length
        })
      };
    }

    // Delete the department
    await db.delete(departments)
      .where(eq(departments.id, departmentId));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Department deleted successfully'
      })
    };

  } catch (error: any) {
    console.error('Delete department error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to delete department',
        details: error.message 
      })
    };
  }
};