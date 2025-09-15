import { Handler } from '@netlify/functions';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';
import { updateHolidayStatusWithAudit, getUserByEmail, getHolidayWithEmployeeDetails } from '../../lib/db/operations';
import { z } from 'zod';

// Input validation schema
const approveRejectSchema = z.object({
  holidayId: z.string().min(1, 'Holiday ID is required'),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional()
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  console.log('🔍 Approve/Reject Holiday Function called');
  console.log('Method:', event.httpMethod);
  console.log('Headers present:', Object.keys(event.headers || {}));

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

  try {
    console.log('📋 Request body:', event.body);

    // Verify authentication
    console.log('🔐 Verifying authentication...');
    const userToken = await verifyAuthFromRequest(event);
    requireAccessToken(userToken);
    console.log('✅ Authentication verified for:', userToken.email);

    // Check admin permissions
    if (userToken.role !== 'admin') {
      console.log('❌ User is not admin:', userToken.role);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Solo gli amministratori possono approvare o rifiutare le ferie' })
      };
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    console.log('📝 Parsed body:', body);
    const validatedData = approveRejectSchema.parse(body);
    console.log('✅ Data validated:', validatedData);

    // Get admin user details
    console.log('👤 Fetching admin user details for:', userToken.email);
    const adminUser = await getUserByEmail(userToken.email);
    if (!adminUser) {
      console.log('❌ Admin user not found in database:', userToken.email);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Amministratore non trovato nel database' })
      };
    }
    console.log('✅ Admin user found:', adminUser.id, adminUser.name);

    // Update holiday status in database with audit logging
    const status = validatedData.action === 'approve' ? 'approved' : 'rejected';
    const ipAddress = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';

    console.log('📝 Updating holiday status:', {
      holidayId: validatedData.holidayId,
      status: status,
      adminId: adminUser.id
    });

    await updateHolidayStatusWithAudit(
      validatedData.holidayId,
      status,
      adminUser.id,
      validatedData.notes,
      ipAddress,
      userAgent
    );

    console.log('✅ Holiday status updated successfully');

    console.log('Holiday approval/rejection completed:', {
      holidayId: validatedData.holidayId,
      action: validatedData.action,
      approvedBy: userToken.email,
      timestamp: new Date().toISOString()
    });

    // Send email notification to employee (don't block on email failures)
    try {
      console.log('🔍 Fetching holiday and employee details for email notification...');
      console.log('- Holiday ID:', validatedData.holidayId);

      // Get holiday details with employee information
      const holidayWithEmployee = await getHolidayWithEmployeeDetails(validatedData.holidayId);

      if (!holidayWithEmployee) {
        console.error('❌ Holiday or employee not found for email notification - skipping email');
        // Don't throw error here - the approval was successful, just skip email
      } else {
        const { holiday, employee } = holidayWithEmployee;

        console.log('✅ Found employee details for email:', {
          employeeId: employee.id,
          employeeName: employee.name,
          employeeEmail: employee.email,
          holidayId: holiday.id,
          holidayDates: `${holiday.startDate} to ${holiday.endDate}`
        });

        const baseUrl = process.env.SITE_URL || process.env.URL || 'https://omnia-holiday-tracker.netlify.app';

        const emailAction = validatedData.action === 'approve' ? 'holiday_request_approved' : 'holiday_request_rejected';

        const emailNotificationData = {
          action: emailAction,
          userData: {
            name: employee.name,
            email: employee.email
          },
          holidayData: {
            id: holiday.id,
            startDate: holiday.startDate,
            endDate: holiday.endDate,
            type: holiday.type,
            workingDays: holiday.workingDays,
            status: status,
            approvedBy: adminUser.name,
            rejectedBy: validatedData.action === 'reject' ? adminUser.name : undefined,
            rejectionReason: validatedData.action === 'reject' ? validatedData.notes : undefined
          },
          adminData: {
            name: adminUser.name,
            email: adminUser.email
          }
        };

        console.log('Sending email notification for holiday decision...');

        const emailResponse = await fetch(`${baseUrl}/.netlify/functions/email-notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailNotificationData)
        });

        if (emailResponse.ok) {
          console.log('✅ Holiday decision email notification sent successfully');
        } else {
          const emailError = await emailResponse.text();
          console.error('⚠️ Failed to send holiday decision email notification:', emailError);
        }
      }
    } catch (emailError) {
      console.error('⚠️ Email notification error (continuing with approval/rejection):', emailError);
    }

    // Response with updated holiday status
    const updatedHoliday = {
      id: validatedData.holidayId,
      status: status,
      approvedBy: userToken.email,
      approvedAt: new Date().toISOString(),
      notes: validatedData.notes
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Richiesta ferie ${validatedData.action === 'approve' ? 'approvata' : 'rifiutata'} con successo`,
        data: updatedHoliday
      })
    };

  } catch (error: any) {
    console.error('❌ Approve/reject holiday error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });

    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.log('Validation error details:', error.issues);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Dati non validi',
          details: error.issues
        })
      };
    }

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
      console.log('Authentication error:', error.message);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Handle database errors
    if (error.message && (error.message.includes('database') || error.message.includes('Holiday not found'))) {
      console.log('Database error:', error.message);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Richiesta ferie non trovata o errore database' })
      };
    }

    // Generic error response
    console.error('Unhandled error type:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Errore interno del server',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        message: error.message || 'Unknown error'
      })
    };
  }
};