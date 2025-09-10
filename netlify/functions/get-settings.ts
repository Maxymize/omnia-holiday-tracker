import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { db } from '../../lib/db/index';
import { settings, users } from '../../lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';

// Query parameters validation schema
const getSettingsSchema = z.object({
  // Filter by setting keys (comma-separated)
  keys: z.string().optional(),
  
  // Include audit information
  includeAudit: z.enum(['true', 'false']).default('false').transform(val => val === 'true')
});

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

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Verify authentication (both admin and employees can read settings)
    const userToken = await verifyAuthFromRequest(event);
    requireAccessToken(userToken);

    // Parse and validate query parameters
    const queryParams = event.queryStringParameters || {};
    const validatedParams = getSettingsSchema.parse(queryParams);

    // Get current user information for access control
    const currentUser = await db
      .select({
        id: users.id,
        role: users.role,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, userToken.userId))
      .limit(1);

    if (!currentUser[0]) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Utente non trovato' })
      };
    }

    const user = currentUser[0];
    const isAdmin = user.role === 'admin';

    // Build settings query
    let settingsQuery: any = db.select().from(settings);

    // Filter by specific keys if provided
    if (validatedParams.keys) {
      const requestedKeys = validatedParams.keys.split(',').map(k => k.trim()).filter(k => k);
      if (requestedKeys.length > 0) {
        settingsQuery = settingsQuery.where(inArray(settings.key, requestedKeys));
      }
    }

    // Execute settings query
    const settingsResult = await settingsQuery;

    // Get updater information if audit info is requested
    const settingsWithAudit = [];
    if (validatedParams.includeAudit && isAdmin) {
      // Only admins can see audit information
      for (const setting of settingsResult) {
        let updaterInfo = null;
        
        if (setting.updatedBy) {
          const updater = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email
            })
            .from(users)
            .where(eq(users.id, setting.updatedBy))
            .limit(1);
          
          updaterInfo = updater[0] || null;
        }

        settingsWithAudit.push({
          ...setting,
          updatedByUser: updaterInfo
        });
      }
    }

    // Transform settings into a more usable format
    const settingsData = (validatedParams.includeAudit && isAdmin ? settingsWithAudit : settingsResult)
      .map((setting: any) => ({
        key: setting.key,
        value: setting.value,
        description: setting.description,
        createdAt: setting.createdAt,
        updatedAt: setting.updatedAt,
        ...(validatedParams.includeAudit && isAdmin && {
          updatedBy: setting.updatedBy,
          updatedByUser: setting.updatedByUser
        })
      }));

    // Create settings object for easier access
    const settingsObject = settingsData.reduce((acc: any, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    // Default settings structure for reference
    const defaultSettings = {
      // Visibility settings
      'holidays.visibility_mode': 'all_see_all', // 'all_see_all' | 'department_only' | 'admin_only'
      'holidays.show_names': 'true', // Show employee names in holiday calendar
      'holidays.show_details': 'false', // Show holiday details (notes, etc.)
      
      // Approval settings
      'holidays.approval_mode': 'manual', // 'auto' | 'manual'
      'holidays.auto_approve_days': '0', // Days in advance for auto-approval
      'holidays.max_consecutive_days': '30', // Maximum consecutive holiday days
      
      // Request settings
      'holidays.advance_notice_days': '14', // Minimum days advance notice
      'holidays.max_future_months': '12', // How far ahead can requests be made
      'holidays.allow_past_requests': 'false', // Allow requests for past dates
      
      // Department settings
      'departments.visibility_enabled': 'true', // Enable department-based visibility
      'departments.cross_department_view': 'false', // Allow viewing other departments
      
      // Notification settings
      'notifications.email_enabled': 'false', // Enable email notifications
      'notifications.browser_enabled': 'true', // Enable browser notifications
      'notifications.remind_managers': 'true', // Remind managers of pending requests
      
      // System settings
      'system.maintenance_mode': 'false', // System maintenance mode
      'system.registration_enabled': 'true', // Allow new employee registration
      'system.domain_restriction_enabled': 'true', // Restrict registration to OmniaGroup domains
      'system.default_holiday_allowance': '25', // Default vacation days per year
      
      // Company settings
      'company.name': 'OmniaGroup',
      'company.time_zone': 'Europe/Rome',
      'company.work_days': 'monday,tuesday,wednesday,thursday,friday'
    };

    // Merge with defaults for missing settings
    const finalSettings = { ...defaultSettings, ...settingsObject };

    // Log access for audit trail
    const accessLog = {
      timestamp: new Date().toISOString(),
      action: 'settings_accessed',
      userId: userToken.userId,
      userEmail: userToken.email,
      userRole: user.role,
      requestedKeys: validatedParams.keys || 'all',
      includeAudit: validatedParams.includeAudit
    };
    console.log('Settings accessed:', JSON.stringify(accessLog));

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        settings: finalSettings,
        ...(validatedParams.includeAudit && isAdmin && {
          audit: settingsData
        }),
        meta: {
          totalSettings: settingsData.length,
          userRole: user.role,
          canModify: isAdmin,
          lastAccessed: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Get settings error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Parametri non validi', 
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