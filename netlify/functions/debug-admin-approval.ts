import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { updateEmployeeStatusWithAudit, getUserByEmail } from '../../lib/db/operations';
import { db } from '../../lib/db';
import { users } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  console.log('DEBUG-ADMIN-APPROVAL: Function started');
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const debugSteps: string[] = [];
  let error: any = null;

  try {
    debugSteps.push('Step 1: Starting debug process');
    
    // Step 1: Test environment variables
    debugSteps.push('Step 2: Checking environment variables');
    const hasJwtSecret = !!process.env.JWT_SECRET;
    const hasDbUrl = !!(process.env.NETLIFY_DATABASE_URL_UNPOOLED || 
                        process.env.DATABASE_URL_UNPOOLED || 
                        process.env.NETLIFY_DATABASE_URL || 
                        process.env.DATABASE_URL);
    
    debugSteps.push(`Environment check: JWT_SECRET=${hasJwtSecret}, DATABASE_URL=${hasDbUrl}`);

    if (!hasJwtSecret) {
      throw new Error('JWT_SECRET not found in environment');
    }

    if (!hasDbUrl) {
      throw new Error('No database URL found in environment');
    }

    // Step 2: Test JWT authentication
    debugSteps.push('Step 3: Testing JWT authentication');
    
    let userToken;
    try {
      userToken = verifyAuthHeader(event.headers.authorization);
      requireAccessToken(userToken);
      debugSteps.push(`JWT verification successful: email=${userToken.email}, role=${userToken.role}`);
    } catch (jwtError: any) {
      debugSteps.push(`JWT verification failed: ${jwtError.message}`);
      throw new Error(`JWT Error: ${jwtError.message}`);
    }

    // Step 3: Check admin permissions
    debugSteps.push('Step 4: Checking admin permissions');
    if (userToken.role !== 'admin') {
      debugSteps.push(`Admin check failed: role=${userToken.role}`);
      throw new Error(`Not admin: role is ${userToken.role}`);
    }
    debugSteps.push('Admin permissions verified');

    // Step 4: Test database connection by fetching admin user
    debugSteps.push('Step 5: Testing database connection');
    
    let adminUser;
    try {
      adminUser = await getUserByEmail(userToken.email);
      debugSteps.push(`Admin user lookup: found=${!!adminUser}, id=${adminUser?.id}, email=${adminUser?.email}`);
    } catch (dbError: any) {
      debugSteps.push(`Database error in getUserByEmail: ${dbError.message}`);
      throw new Error(`Database Error: ${dbError.message}`);
    }

    if (!adminUser) {
      debugSteps.push('Admin user not found in database');
      throw new Error('Admin user not found in database');
    }

    // Step 5: Find the target employee (giurmax@icloud.com)
    debugSteps.push('Step 6: Looking up target employee (giurmax@icloud.com)');
    
    let targetEmployee;
    try {
      targetEmployee = await getUserByEmail('giurmax@icloud.com');
      debugSteps.push(`Target employee lookup: found=${!!targetEmployee}, id=${targetEmployee?.id}, status=${targetEmployee?.status}`);
    } catch (dbError: any) {
      debugSteps.push(`Database error looking up target employee: ${dbError.message}`);
      throw new Error(`Database Error looking up employee: ${dbError.message}`);
    }

    if (!targetEmployee) {
      debugSteps.push('Target employee (giurmax@icloud.com) not found in database');
      throw new Error('Target employee not found in database');
    }

    // Step 6: Test the update operation
    debugSteps.push('Step 7: Testing updateEmployeeStatusWithAudit function');
    
    try {
      await updateEmployeeStatusWithAudit(
        targetEmployee.id,
        'active',
        adminUser.id,
        'Debug test approval',
        event.headers['x-forwarded-for'] || 'unknown',
        event.headers['user-agent'] || 'unknown'
      );
      debugSteps.push('updateEmployeeStatusWithAudit completed successfully');
    } catch (updateError: any) {
      debugSteps.push(`Update operation failed: ${updateError.message}`);
      debugSteps.push(`Update error stack: ${updateError.stack}`);
      throw new Error(`Update Error: ${updateError.message}`);
    }

    // Step 7: Verify the update worked
    debugSteps.push('Step 8: Verifying update worked');
    
    try {
      const updatedEmployee = await getUserByEmail('giurmax@icloud.com');
      debugSteps.push(`Verification: status is now ${updatedEmployee?.status}`);
    } catch (verifyError: any) {
      debugSteps.push(`Verification failed: ${verifyError.message}`);
    }

    debugSteps.push('All tests completed successfully!');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Debug test completed successfully',
        steps: debugSteps,
        targetEmployee: {
          id: targetEmployee.id,
          email: targetEmployee.email,
          status: targetEmployee.status
        },
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role
        }
      })
    };

  } catch (testError: any) {
    error = testError;
    debugSteps.push(`FATAL ERROR: ${testError.message}`);
    
    console.error('DEBUG-ADMIN-APPROVAL Error:', testError);
    console.error('Steps completed:', debugSteps);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: testError.message,
        steps: debugSteps,
        errorType: testError.constructor.name,
        stack: testError.stack
      })
    };
  }
};