import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../lib/db/index';
import { holidays, users, auditLogs } from '../../lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { verifyAuthHeader, requireAccessToken, requireAdmin } from '../../lib/auth/jwt-utils';

// Input validation schema for deletion request
const deleteActivitiesSchema = z.object({
  activityIds: z.array(z.string().min(1, 'ID attività non può essere vuoto'))
    .min(1, 'Almeno un ID attività deve essere specificato')
    .max(100, 'Non è possibile eliminare più di 100 attività alla volta')
});

// Activity ID parsing result
interface ParsedActivityId {
  type: 'holiday' | 'employee';
  resourceId: string;
  originalId: string;
  subtype?: 'request' | 'approved' | 'rejected';
}

// Deletion result for each activity
interface DeletionResult {
  activityId: string;
  success: boolean;
  message: string;
  resourceType?: string;
  resourceId?: string;
}

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Parse activity ID to understand what resource it represents
 * Activity IDs follow these patterns:
 * - holiday_{holidayId} (holiday request)
 * - holiday_approved_{holidayId} (holiday approval)
 * - holiday_rejected_{holidayId} (holiday rejection)
 * - employee_{userId} (employee registration)
 */
function parseActivityId(activityId: string): ParsedActivityId | null {
  // Holiday-related activities
  if (activityId.startsWith('holiday_approved_')) {
    const resourceId = activityId.replace('holiday_approved_', '');
    return {
      type: 'holiday',
      resourceId,
      originalId: activityId,
      subtype: 'approved'
    };
  }
  
  if (activityId.startsWith('holiday_rejected_')) {
    const resourceId = activityId.replace('holiday_rejected_', '');
    return {
      type: 'holiday',
      resourceId,
      originalId: activityId,
      subtype: 'rejected'
    };
  }
  
  if (activityId.startsWith('holiday_')) {
    const resourceId = activityId.replace('holiday_', '');
    return {
      type: 'holiday',
      resourceId,
      originalId: activityId,
      subtype: 'request'
    };
  }
  
  // Employee-related activities
  if (activityId.startsWith('employee_')) {
    const resourceId = activityId.replace('employee_', '');
    return {
      type: 'employee',
      resourceId,
      originalId: activityId
    };
  }
  
  return null;
}

/**
 * Create audit log entry for activity deletion
 */
async function createAuditLog(
  userId: string, 
  userEmail: string, 
  deletionResult: DeletionResult,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await db.insert(auditLogs).values({
      action: 'data_deletion',
      userId,
      targetResourceId: deletionResult.resourceId || null,
      resourceType: deletionResult.resourceType || 'activity',
      details: JSON.stringify({
        activityId: deletionResult.activityId,
        success: deletionResult.success,
        message: deletionResult.message,
        timestamp: new Date().toISOString(),
        userEmail
      }),
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  } catch (error) {
    console.error('Failed to create audit log for deletion:', error);
  }
}

/**
 * Delete holiday-related activity
 */
async function deleteHolidayActivity(parsedId: ParsedActivityId): Promise<DeletionResult> {
  const { resourceId, subtype, originalId } = parsedId;
  
  try {
    // First, check if the holiday exists
    const existingHoliday = await db
      .select()
      .from(holidays)
      .where(eq(holidays.id, resourceId))
      .limit(1);

    if (existingHoliday.length === 0) {
      return {
        activityId: originalId,
        success: false,
        message: 'Richiesta ferie non trovata',
        resourceType: 'holiday',
        resourceId
      };
    }

    const holiday = existingHoliday[0];

    // Different handling based on subtype
    switch (subtype) {
      case 'request':
        // Delete the entire holiday request (this will also remove approval/rejection activities)
        await db.delete(holidays).where(eq(holidays.id, resourceId));
        return {
          activityId: originalId,
          success: true,
          message: 'Richiesta ferie eliminata con successo',
          resourceType: 'holiday',
          resourceId
        };

      case 'approved':
      case 'rejected':
        // Reset holiday approval status (remove approval/rejection, set back to pending)
        await db
          .update(holidays)
          .set({
            status: 'pending',
            approvedBy: null,
            approvedAt: null,
            rejectionReason: null,
            updatedAt: new Date()
          })
          .where(eq(holidays.id, resourceId));
        
        return {
          activityId: originalId,
          success: true,
          message: `Stato approvazione ferie rimosso, riportato in attesa`,
          resourceType: 'holiday',
          resourceId
        };

      default:
        return {
          activityId: originalId,
          success: false,
          message: 'Sottotipo di attività ferie non riconosciuto',
          resourceType: 'holiday',
          resourceId
        };
    }
  } catch (error) {
    console.error(`Error deleting holiday activity ${originalId}:`, error);
    return {
      activityId: originalId,
      success: false,
      message: 'Errore durante l\'eliminazione dell\'attività ferie',
      resourceType: 'holiday',
      resourceId
    };
  }
}

/**
 * Delete employee-related activity
 */
async function deleteEmployeeActivity(parsedId: ParsedActivityId): Promise<DeletionResult> {
  const { resourceId, originalId } = parsedId;
  
  try {
    // First, check if the employee exists
    const existingEmployee = await db
      .select()
      .from(users)
      .where(eq(users.id, resourceId))
      .limit(1);

    if (existingEmployee.length === 0) {
      return {
        activityId: originalId,
        success: false,
        message: 'Dipendente non trovato',
        resourceType: 'employee',
        resourceId
      };
    }

    const employee = existingEmployee[0];

    // Check if employee has associated holidays
    const associatedHolidays = await db
      .select()
      .from(holidays)
      .where(eq(holidays.userId, resourceId))
      .limit(1);

    if (associatedHolidays.length > 0) {
      return {
        activityId: originalId,
        success: false,
        message: 'Impossibile eliminare: il dipendente ha richieste ferie associate',
        resourceType: 'employee',
        resourceId
      };
    }

    // Check if employee is an admin (prevent deletion of admin users)
    if (employee.role === 'admin') {
      return {
        activityId: originalId,
        success: false,
        message: 'Impossibile eliminare: non è possibile eliminare utenti amministratori',
        resourceType: 'employee',
        resourceId
      };
    }

    // Delete the employee record
    await db.delete(users).where(eq(users.id, resourceId));

    return {
      activityId: originalId,
      success: true,
      message: 'Dipendente eliminato con successo',
      resourceType: 'employee',
      resourceId
    };
  } catch (error) {
    console.error(`Error deleting employee activity ${originalId}:`, error);
    return {
      activityId: originalId,
      success: false,
      message: 'Errore durante l\'eliminazione dell\'attività dipendente',
      resourceType: 'employee',
      resourceId
    };
  }
}

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow DELETE requests
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Verify authentication and require admin access
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);
    requireAdmin(userToken);

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Formato JSON non valido' })
      };
    }

    const validatedData = deleteActivitiesSchema.parse(requestBody);

    console.log(`🗑️ Delete Activities Request:`, {
      userId: userToken.userId,
      userEmail: userToken.email,
      activityIds: validatedData.activityIds,
      count: validatedData.activityIds.length,
      timestamp: new Date().toISOString()
    });

    // Extract client info for audit logging
    const ipAddress = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    const userAgent = event.headers['user-agent'] || 'unknown';

    // Process each activity ID
    const results: DeletionResult[] = [];
    const successfulDeletions: string[] = [];
    const failedDeletions: string[] = [];

    for (const activityId of validatedData.activityIds) {
      // Parse activity ID to understand what we're deleting
      const parsedId = parseActivityId(activityId);
      
      if (!parsedId) {
        const result: DeletionResult = {
          activityId,
          success: false,
          message: 'Formato ID attività non riconosciuto'
        };
        results.push(result);
        failedDeletions.push(activityId);
        continue;
      }

      // Delete based on activity type
      let result: DeletionResult;
      
      switch (parsedId.type) {
        case 'holiday':
          result = await deleteHolidayActivity(parsedId);
          break;
        case 'employee':
          result = await deleteEmployeeActivity(parsedId);
          break;
        default:
          result = {
            activityId,
            success: false,
            message: 'Tipo di attività non supportato'
          };
      }

      results.push(result);
      
      if (result.success) {
        successfulDeletions.push(activityId);
      } else {
        failedDeletions.push(activityId);
      }

      // Create audit log entry
      await createAuditLog(userToken.userId, userToken.email, result, ipAddress, userAgent);
    }

    // Prepare summary statistics
    const summary = {
      total: validatedData.activityIds.length,
      successful: successfulDeletions.length,
      failed: failedDeletions.length,
      successRate: Math.round((successfulDeletions.length / validatedData.activityIds.length) * 100)
    };

    // Log deletion summary
    const deletionLog = {
      timestamp: new Date().toISOString(),
      action: 'bulk_activities_deletion',
      userId: userToken.userId,
      userEmail: userToken.email,
      summary,
      results: results.map(r => ({
        activityId: r.activityId,
        success: r.success,
        resourceType: r.resourceType
      }))
    };
    console.log('Bulk activities deletion completed:', JSON.stringify(deletionLog));

    // Return results
    const httpStatus = summary.successful > 0 ? (summary.failed > 0 ? 207 : 200) : 400; // 207 = Multi-Status

    return {
      statusCode: httpStatus,
      headers,
      body: JSON.stringify({
        success: summary.successful > 0,
        message: summary.failed === 0 
          ? `Tutte le ${summary.successful} attività sono state eliminate con successo`
          : summary.successful === 0
          ? `Nessuna attività è stata eliminata. ${summary.failed} errori.`
          : `${summary.successful} attività eliminate, ${summary.failed} errori`,
        data: {
          summary,
          results,
          successfulDeletions,
          failedDeletions
        }
      })
    };

  } catch (error) {
    console.error('Delete activities error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Handle admin access errors
    if (error instanceof Error && error.message.includes('Admin')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Accesso negato: solo gli amministratori possono eliminare le attività' })
      };
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Dati non validi', 
          details: error.issues?.map(e => `${e.path.join('.')}: ${e.message}`)
        })
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