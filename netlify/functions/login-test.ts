import { Handler } from '@netlify/functions';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByEmail, getDepartments } from '../../lib/db/operations';
import { createAuditLog } from '../../lib/db/helpers';
import { autoInitializeDatabase, isDatabaseInitialized } from '../../lib/db/auto-init';

// Production database will be used - no hardcoded users needed

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
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
    // Check if database needs initialization (for admin login)
    const adminEmail = process.env.ADMIN_EMAIL || 'max.giurastante@omniaservices.net';
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email e password sono richiesti' })
      };
    }
    
    // If this is admin login attempt and database is not initialized, initialize it
    if (email.toLowerCase() === adminEmail.toLowerCase()) {
      const isInitialized = await isDatabaseInitialized();
      if (!isInitialized) {
        console.log('🚀 Database not initialized, starting auto-initialization...');
        await autoInitializeDatabase();
        console.log('✅ Database auto-initialization completed');
      }
    }

    // Try to find user in database
    const user = await getUserByEmail(email.toLowerCase());
    if (!user) {
      console.log(`Login attempt for unknown user: ${email}`);
      
      // Log failed login attempt
      try {
        await createAuditLog(
          'login_attempt',
          null,
          { 
            email, 
            success: false, 
            reason: 'User not found' 
          },
          undefined,
          undefined,
          'authentication',
          event.headers['x-forwarded-for'] || event.headers['client-ip'],
          event.headers['user-agent']
        );
      } catch (auditError) {
        console.error('Failed to log failed login attempt:', auditError);
      }
      
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Credenziali non valide' })
      };
    }
    
    // Check if user is approved (active status)
    if (user.status !== 'active') {
      console.log(`Login attempt for unapproved user: ${email} (status: ${user.status})`);
      
      // Log failed login attempt  
      try {
        await createAuditLog(
          'login_attempt',
          user.id,
          { 
            email, 
            success: false, 
            reason: `Account not active: ${user.status}` 
          },
          user.id,
          undefined,
          'authentication',
          event.headers['x-forwarded-for'] || event.headers['client-ip'],
          event.headers['user-agent']
        );
      } catch (auditError) {
        console.error('Failed to log failed login attempt:', auditError);
      }
      
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Account in attesa di approvazione' })
      };
    }
    
    console.log(`Database user found: ${email} (status: ${user.status})`);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      console.log(`Invalid password for user: ${email}`);
      
      // Log failed login attempt
      try {
        await createAuditLog(
          'login_attempt',
          user.id,
          { 
            email, 
            success: false, 
            reason: 'Invalid password' 
          },
          user.id,
          undefined,
          'authentication',
          event.headers['x-forwarded-for'] || event.headers['client-ip'],
          event.headers['user-agent']
        );
      } catch (auditError) {
        console.error('Failed to log failed login attempt:', auditError);
      }
      
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Credenziali non valide' })
      };
    }

    // Get user department information from database
    let department = null;
    let departmentName = null;
    
    if (user.departmentId) {
      try {
        const departments = await getDepartments();
        const userDepartment = departments.find(dept => dept.id === user.departmentId);
        if (userDepartment) {
          department = userDepartment.id;
          departmentName = userDepartment.name;
        }
      } catch (deptError) {
        console.error('Failed to load department information:', deptError);
        // Continue without department info
      }
    }

    // Log successful login
    try {
      await createAuditLog(
        'login_attempt',
        user.id,
        { 
          email, 
          success: true, 
          userAgent: event.headers['user-agent'] || 'Unknown'
        },
        user.id,
        undefined,
        'authentication',
        event.headers['x-forwarded-for'] || event.headers['client-ip'],
        event.headers['user-agent']
      );
    } catch (auditError) {
      console.error('Failed to log successful login:', auditError);
    }
    
    // Generate JWT token with proper format for jwt-utils validation
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access' // Required by requireAccessToken function
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: '1h' });

    // Create secure cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = `HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Strict; Path=/`;
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': `auth-token=${accessToken}; Max-Age=3600; ${cookieOptions}`
      },
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            departmentId: department,    // Changed from 'department' to 'departmentId'
            departmentName,
            holidayAllowance: user.holidayAllowance
          },
          accessToken
        }
      })
    };

  } catch (error) {
    console.error('Login error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server' })
    };
  }
};