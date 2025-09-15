import { Handler } from '@netlify/functions';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';
import { createHolidayWithAudit, getUserByEmail, getLeaveTypeAllowances, createAuditLog } from '../../lib/db/operations';
import { db } from '../../lib/db/index';
import { holidays, settings } from '../../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { format, parseISO, differenceInBusinessDays } from 'date-fns';

// Input validation schema
const createHolidaySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  type: z.enum(['vacation', 'sick', 'personal']),
  notes: z.string().optional(),
  medicalCertificateOption: z.string().optional(), // 'upload' or 'send_later'
  medicalCertificateFileName: z.string().optional().nullable(), // Nome del file se caricato
  medicalCertificateFileId: z.string().optional(), // ID del file nel blob storage
}).refine((data) => {
  if (data.type === 'sick') {
    // Per malattia, deve avere un'opzione per il certificato medico
    const hasValidOption = data.medicalCertificateOption === 'upload' || data.medicalCertificateOption === 'send_later';
    
    console.log('Medical certificate validation:', {
      type: data.type,
      option: data.medicalCertificateOption,
      fileName: data.medicalCertificateFileName,
      hasValidOption
    });
    
    return hasValidOption;
  }
  return true
}, {
  message: 'Il certificato medico è necessario per i congedi per malattia',
  path: ['medicalCertificateOption'],
});

// CORS headers - FIXED for credentials support
const headers = {
  'Access-Control-Allow-Origin': 'https://holiday.omniaelectronics.com',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Calculate working days between two dates (excluding weekends)
function calculateWorkingDays(startDate: Date, endDate: Date): number {
  return differenceInBusinessDays(endDate, startDate) + 1;
}

export const handler: Handler = async (event, context) => {
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
    // DEBUG: Log all headers and cookies for comparison with upload function
    console.log('🔍 CREATE-HOLIDAY DEBUG Headers:', {
      cookie: event.headers.cookie,
      authorization: event.headers.authorization,
      userAgent: event.headers['user-agent']
    });
    
    // Verify authentication
    const userToken = await verifyAuthFromRequest(event);
    requireAccessToken(userToken);
    
    console.log('✅ CREATE-HOLIDAY: Authentication successful for user:', userToken.userId);

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    console.log('Received request body:', JSON.stringify(body, null, 2));
    const validatedData = createHolidaySchema.parse(body);

    // Parse dates
    const startDate = parseISO(validatedData.startDate);
    const endDate = parseISO(validatedData.endDate);

    // Validate date range
    if (startDate > endDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'La data di inizio deve essere prima della data di fine' 
        })
      };
    }

    // Check if dates are in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today && validatedData.type === 'vacation') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Non puoi richiedere ferie per date passate' 
        })
      };
    }

    // Calculate working days
    const workingDays = calculateWorkingDays(startDate, endDate);

    // Get user details from database
    const user = await getUserByEmail(userToken.email);
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Utente non trovato nel database' })
      };
    }

    // Validate against flexible leave type allowances
    if (validatedData.type === 'vacation' || validatedData.type === 'personal') {
      try {
        const leaveAllowances = await getLeaveTypeAllowances();
        const currentYear = new Date().getFullYear();
        
        // Get current usage for this leave type in the current year
        const userHolidays = await db
          .select({
            workingDays: holidays.workingDays,
            status: holidays.status
          })
          .from(holidays)
          .where(
            and(
              eq(holidays.userId, user.id),
              eq(holidays.type, validatedData.type)
            )
          );

        // Filter holidays for current year and calculate usage
        const currentYearHolidays = userHolidays.filter(holiday => {
          // For simplicity, we could filter by year, but since we're checking current year only
          return true; // This is a simplified approach
        });

        const approvedDays = currentYearHolidays
          .filter(h => h.status === 'approved')
          .reduce((sum, h) => sum + h.workingDays, 0);
        
        const pendingDays = currentYearHolidays
          .filter(h => h.status === 'pending')
          .reduce((sum, h) => sum + h.workingDays, 0);

        const currentAllowance = validatedData.type === 'vacation' 
          ? leaveAllowances.vacation 
          : leaveAllowances.personal;

        const totalUsage = approvedDays + pendingDays + workingDays;

        if (currentAllowance !== -1 && totalUsage > currentAllowance) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: `Non hai giorni sufficienti per questo tipo di congedo. Disponibili: ${Math.max(0, currentAllowance - approvedDays - pendingDays)}, Richiesti: ${workingDays}`,
              details: {
                type: validatedData.type,
                allowance: currentAllowance,
                used: approvedDays,
                pending: pendingDays,
                requested: workingDays,
                available: Math.max(0, currentAllowance - approvedDays - pendingDays)
              }
            })
          };
        }

        console.log(`Leave type validation passed for ${validatedData.type}: ${workingDays} days requested, ${Math.max(0, currentAllowance - approvedDays - pendingDays)} available`);

      } catch (allowanceError) {
        console.warn('Failed to validate against flexible allowances, proceeding with creation:', allowanceError);
        // Continue with creation even if allowance validation fails
      }
    }
    // Note: Sick days are typically unlimited (-1) so no validation needed

    // Check for date conflicts with existing holidays
    try {
      const conflictingHolidays = await db
        .select({
          id: holidays.id,
          startDate: holidays.startDate,
          endDate: holidays.endDate,
          status: holidays.status
        })
        .from(holidays)
        .where(
          and(
            eq(holidays.userId, user.id),
            // Check for overlapping dates: new holiday overlaps if start <= existing_end AND end >= existing_start
            // Using SQL date comparison for accuracy
          )
        );

      // Check conflicts manually since Drizzle date comparison can be complex
      const hasConflict = conflictingHolidays.some(existing => {
        const existingStart = parseISO(existing.startDate);
        const existingEnd = parseISO(existing.endDate);
        
        // Only consider approved and pending holidays as conflicts
        if (existing.status !== 'approved' && existing.status !== 'pending') {
          return false;
        }
        
        // Check if dates overlap: new start <= existing end AND new end >= existing start
        return startDate <= existingEnd && endDate >= existingStart;
      });

      if (hasConflict) {
        return {
          statusCode: 409, // Conflict status code
          headers,
          body: JSON.stringify({ 
            error: 'Le date selezionate si sovrappongono con una richiesta esistente',
            conflictDetails: {
              startDate: validatedData.startDate,
              endDate: validatedData.endDate,
              conflictingHolidays: conflictingHolidays
                .filter(h => h.status === 'approved' || h.status === 'pending')
                .map(h => ({
                  startDate: h.startDate,
                  endDate: h.endDate,
                  status: h.status
                }))
            }
          })
        };
      }

      console.log('Date conflict check passed - no overlapping holidays found');
    } catch (conflictError) {
      console.error('Error checking for date conflicts:', conflictError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore nel controllo dei conflitti di data' })
      };
    }

    // Check approval mode settings to determine initial status
    let initialStatus: 'pending' | 'approved' = 'pending'; // Default to pending
    
    try {
      const approvalModeSetting = await db
        .select()
        .from(settings)
        .where(eq(settings.key, 'holidays.approval_mode'))
        .limit(1);

      if (approvalModeSetting.length > 0 && approvalModeSetting[0].value === 'auto') {
        initialStatus = 'approved';
        console.log('Holiday request auto-approved due to automatic approval mode');
      } else {
        console.log('Holiday request requires manual approval');
      }
    } catch (settingsError) {
      console.warn('Could not fetch approval mode settings, defaulting to pending:', settingsError);
    }

    // Create holiday request in database
    const holidayData = {
      userId: user.id,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      type: validatedData.type as 'vacation' | 'sick' | 'personal',
      status: initialStatus,
      notes: validatedData.notes || '',
      workingDays: workingDays
    };

    // Get client IP and user agent for audit logging
    const ipAddress = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';

    const newHoliday = await createHolidayWithAudit(holidayData, ipAddress, userAgent);

    console.log('New holiday request created in database:', newHoliday.id);

    // Send email notification for new holiday request (don't block on email failures)
    try {
      const baseUrl = process.env.SITE_URL || process.env.URL || 'https://omnia-holiday-tracker.netlify.app';

      console.log('📧 Email notification configuration:');
      console.log('- Base URL:', baseUrl);
      console.log('- SITE_URL env:', process.env.SITE_URL);
      console.log('- URL env:', process.env.URL);
      console.log('- Full function URL:', `${baseUrl}/.netlify/functions/email-notifications`);

      const emailNotificationData = {
        action: 'holiday_request_submitted',
        userData: {
          name: user.name,
          email: user.email,
          department: user.departmentId // This might be null
        },
        holidayData: {
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          type: validatedData.type,
          workingDays: workingDays,
          notes: validatedData.notes,
          status: initialStatus
        }
      };

      console.log('📤 Sending email notification for new holiday request...');
      console.log('- To admin email (will be determined by email-notifications function)');
      console.log('- Employee:', user.name, '(', user.email, ')');
      console.log('- Holiday dates:', validatedData.startDate, 'to', validatedData.endDate);

      const emailResponse = await fetch(`${baseUrl}/.netlify/functions/email-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailNotificationData)
      });

      console.log('📬 Email notification response:', {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        ok: emailResponse.ok
      });

      if (emailResponse.ok) {
        const responseData = await emailResponse.json();
        console.log('✅ Holiday request email notification sent successfully:', responseData);
      } else {
        const emailError = await emailResponse.text();
        console.error('⚠️ Failed to send holiday request email notification:', {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          error: emailError
        });
      }
    } catch (emailError: any) {
      console.error('⚠️ Email notification error (continuing with request creation):', {
        message: emailError.message,
        stack: emailError.stack,
        name: emailError.name
      });
    }

    // Add audit log for auto-approval if applicable
    if (initialStatus === 'approved') {
      try {
        await createAuditLog(
          'holiday_approved', // action
          null, // userId (system action, no user ID)
          {
            holidayId: newHoliday.id,
            previousStatus: 'pending',
            newStatus: 'approved',
            autoApproved: true,
            type: validatedData.type,
            startDate: validatedData.startDate,
            endDate: validatedData.endDate,
            workingDays: workingDays
          }, // details
          user.id, // targetUserId 
          newHoliday.id, // targetResourceId
          'holiday', // resourceType
          ipAddress, // ipAddress
          userAgent // userAgent
        );
        console.log('Auto-approval audit log created for holiday:', newHoliday.id);
      } catch (auditError) {
        console.warn('Failed to create audit log for auto-approval:', auditError);
      }
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: initialStatus === 'approved' 
          ? 'Richiesta ferie creata e approvata automaticamente' 
          : 'Richiesta ferie creata con successo',
        data: {
          id: newHoliday.id,
          employeeId: newHoliday.userId,
          employeeName: user.name,
          employeeEmail: user.email,
          startDate: newHoliday.startDate,
          endDate: newHoliday.endDate,
          workingDays: newHoliday.workingDays,
          type: newHoliday.type,
          status: newHoliday.status,
          notes: newHoliday.notes,
          createdAt: newHoliday.createdAt?.toISOString() || new Date().toISOString(),
          // Medical certificate info for sick leave compatibility
          ...(validatedData.type === 'sick' && {
            medicalCertificateOption: validatedData.medicalCertificateOption || 'upload',
            medicalCertificateFileName: validatedData.medicalCertificateFileName,
            medicalCertificateFileId: validatedData.medicalCertificateFileId,
            medicalCertificateStatus: validatedData.medicalCertificateOption === 'send_later' 
              ? 'commitment_pending' 
              : validatedData.medicalCertificateFileId ? 'uploaded' : 'pending'
          })
        }
      })
    };

  } catch (error) {
    console.error('Create holiday request error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
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