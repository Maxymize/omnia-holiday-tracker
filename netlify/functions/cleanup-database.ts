import { Handler } from '@netlify/functions';
import { db } from '../../lib/db';
import { users, holidays, departments, auditLogs } from '../../lib/db/schema';
import { eq, ne, not, and, lt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

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
    const { action, adminPassword } = body;

    // Verify admin password
    if (adminPassword !== 'admin123') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const results: any = {};

    switch (action) {
      case 'remove-duplicates':
        // Get all admin users
        const adminUsers = await db.select()
          .from(users)
          .where(eq(users.email, 'max.giurastante@omniaservices.net'));
        
        // Keep only the first one, delete others
        if (adminUsers.length > 1) {
          const [keepUser, ...duplicates] = adminUsers;
          for (const duplicate of duplicates) {
            await db.delete(users).where(eq(users.id, duplicate.id));
          }
          results.duplicatesRemoved = duplicates.length;
        } else {
          results.duplicatesRemoved = 0;
        }
        break;

      case 'remove-mock-holidays':
        // Remove all mock holiday requests (those with mock email domains)
        const mockEmails = [
          '%@ominiaservice.net', // Note the typo in mock data
          '%@omniaelectronics.com', // Mock electronics company
        ];
        
        // Get mock users
        const mockUsers = await db.select()
          .from(users)
          .where(
            and(
              ne(users.email, 'max.giurastante@omniaservices.net'),
              ne(users.role, 'admin')
            )
          );
        
        // Delete mock holidays
        let holidaysDeleted = 0;
        for (const user of mockUsers) {
          // Check if it's a mock user (has ominiaservice.net or test domains)
          if (user.email.includes('@ominiaservice.net') || 
              user.email.includes('@omniaelectronics.com') ||
              user.email.includes('test') ||
              user.email.includes('example')) {
            const deleted = await db.delete(holidays)
              .where(eq(holidays.userId, user.id));
            holidaysDeleted++;
          }
        }
        
        results.holidaysRemoved = holidaysDeleted;
        break;

      case 'remove-mock-users':
        // Remove all mock users except admin
        const deletedUsers = await db.delete(users)
          .where(
            and(
              ne(users.email, 'max.giurastante@omniaservices.net'),
              ne(users.role, 'admin')
            )
          );
        
        results.usersRemoved = 'Mock users removed';
        break;

      case 'remove-mock-departments':
        // Remove all mock departments
        const allDepartments = await db.select().from(departments);
        
        // Delete all departments (they're all mock)
        for (const dept of allDepartments) {
          await db.delete(departments).where(eq(departments.id, dept.id));
        }
        
        results.departmentsRemoved = allDepartments.length;
        break;

      case 'clean-all':
        // Complete cleanup - remove everything except admin user
        
        // 1. Delete all holidays
        await db.delete(holidays);
        results.holidaysRemoved = 'All';
        
        // 2. Delete all departments
        await db.delete(departments);
        results.departmentsRemoved = 'All';
        
        // 3. Delete all users except admin
        await db.delete(users)
          .where(ne(users.email, 'max.giurastante@omniaservices.net'));
        results.usersRemoved = 'All except admin';
        
        // 4. Skip audit logs cleanup for now - can cause issues
        results.auditLogsRemoved = 'Skipped';
        
        break;

      case 'reset-admin':
        // Reset admin password to admin123
        const adminUser = await db.select()
          .from(users)
          .where(eq(users.email, 'max.giurastante@omniaservices.net'))
          .limit(1);
        
        if (adminUser[0]) {
          const newPasswordHash = await bcrypt.hash('admin123', 12);
          await db.update(users)
            .set({ passwordHash: newPasswordHash })
            .where(eq(users.id, adminUser[0].id));
          results.adminReset = true;
        } else {
          results.adminReset = false;
          results.error = 'Admin user not found';
        }
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        action,
        results,
        message: 'Database cleanup completed'
      })
    };

  } catch (error: any) {
    console.error('Database cleanup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};