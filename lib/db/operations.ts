import { db } from './index';
import { users, departments, holidays, settings, auditLogs } from './schema';
import { eq, and, or, inArray, gte, lte, ilike, desc } from 'drizzle-orm';
import type { 
  NewUser, 
  NewDepartment, 
  NewHoliday, 
  NewSetting, 
  NewAuditLog,
  User,
  Holiday,
  Department,
  Setting,
  AuditLog,
  HolidayStatus,
  UserStatus,
  AuditLogAction
} from './schema';

// ============================================
// HOLIDAY STATUS OPERATIONS (Mock compatibility)
// ============================================

export async function getHolidayStatus(holidayId: string): Promise<string | undefined> {
  try {
    const holiday = await db.select({ status: holidays.status })
      .from(holidays)
      .where(eq(holidays.id, holidayId))
      .limit(1);
    
    const status = holiday[0]?.status;
    console.log(`Getting status for ${holidayId}: ${status || 'not found'}`);
    return status;
  } catch (error) {
    console.error('Failed to get holiday status:', error);
    return undefined;
  }
}

export async function updateHolidayStatus(
  holidayId: string, 
  status: HolidayStatus, 
  approvedBy: string, 
  notes?: string
): Promise<void> {
  try {
    const updateData: any = {
      status,
      approvedAt: status === 'approved' ? new Date() : null,
      updatedAt: new Date()
    };

    if (approvedBy) {
      // Find user by email or ID
      const approver = await db.select({ id: users.id })
        .from(users)
        .where(or(eq(users.email, approvedBy), eq(users.id, approvedBy)))
        .limit(1);
      
      if (approver[0]) {
        updateData.approvedBy = approver[0].id;
      }
    }

    if (status === 'rejected' && notes) {
      updateData.rejectionReason = notes;
    }

    await db.update(holidays).set(updateData).where(eq(holidays.id, holidayId));
    console.log(`Updated status for ${holidayId} to ${status}`);
  } catch (error) {
    console.error('Failed to update holiday status:', error);
    throw error;
  }
}

// ============================================
// EMPLOYEE STATUS OPERATIONS (Mock compatibility)
// ============================================

export async function getEmployeeStatus(employeeId: string): Promise<string | undefined> {
  try {
    const employee = await db.select({ status: users.status })
      .from(users)
      .where(eq(users.id, employeeId))
      .limit(1);
    
    const status = employee[0]?.status;
    console.log(`Getting employee status for ${employeeId}: ${status || 'not found'}`);
    return status;
  } catch (error) {
    console.error('Failed to get employee status:', error);
    return undefined;
  }
}

export async function updateEmployeeStatus(
  employeeId: string, 
  status: UserStatus, 
  approvedBy: string, 
  reason?: string
): Promise<void> {
  try {
    await db.update(users)
      .set({ 
        status, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, employeeId));

    // Log the approval action in an audit trail (if needed)
    console.log(`Updated employee status for ${employeeId} to ${status} by ${approvedBy}${reason ? ` (${reason})` : ''}`);
    
    // TODO: Add to audit log table when created
  } catch (error) {
    console.error('Failed to update employee status:', error);
    throw error;
  }
}

// ============================================
// GENERIC DATA STORAGE (Mock compatibility)
// ============================================

interface StorageData {
  holidays: Holiday[];
  users: User[];
  departments: Department[];
  settings: any;
  [key: string]: any;
}

let memoryCache: { [key: string]: any } = {};

export async function saveToMockStorage(key: string, data: any): Promise<void> {
  try {
    console.log(`Saving data for key: ${key}`);
    
    // Handle specific data types
    switch (key) {
      case 'new-holiday-requests':
        // Save holiday requests to database
        if (Array.isArray(data)) {
          for (const holidayData of data) {
            if (!holidayData.id || holidayData.id.startsWith('temp_')) {
              // This is a new request, save to database
              await saveHolidayRequest(holidayData);
            }
          }
        }
        break;
      
      case 'system-settings':
        // Save system settings
        if (data && data.settings) {
          await saveSystemSettings(data.settings);
        }
        break;
      
      default:
        // Store in memory cache for other data types
        memoryCache[key] = data;
        console.log(`Stored in memory cache for key: ${key}`);
    }
  } catch (error) {
    console.error(`Failed to save data for key ${key}:`, error);
    throw error;
  }
}

export async function loadFromMockStorage(key: string): Promise<any | null> {
  try {
    console.log(`Loading data for key: ${key}`);
    
    switch (key) {
      case 'new-holiday-requests':
        // Load from database
        return await loadHolidayRequests();
      
      case 'system-settings':
        // Load system settings
        return await loadSystemSettings();
      
      default:
        // Load from memory cache
        const cached = memoryCache[key];
        if (cached) {
          console.log(`Loaded from memory cache for key: ${key}`);
          return cached;
        }
        return null;
    }
  } catch (error) {
    console.error(`Failed to load data for key ${key}:`, error);
    return null;
  }
}

// ============================================
// HOLIDAY REQUEST OPERATIONS
// ============================================

async function saveHolidayRequest(holidayData: any): Promise<Holiday> {
  try {
    // Convert mock holiday data to database format
    const dbHolidayData: NewHoliday = {
      id: holidayData.id?.startsWith('h') ? holidayData.id : undefined,
      userId: holidayData.employeeId || holidayData.userId,
      startDate: holidayData.startDate,
      endDate: holidayData.endDate,
      type: holidayData.type as 'vacation' | 'sick' | 'personal',
      status: holidayData.status as HolidayStatus,
      notes: holidayData.notes,
      workingDays: holidayData.workingDays,
      createdAt: holidayData.createdAt ? new Date(holidayData.createdAt) : new Date(),
      updatedAt: new Date()
    };

    const result = await db.insert(holidays).values(dbHolidayData).returning();
    return result[0];
  } catch (error) {
    console.error('Failed to save holiday request:', error);
    throw error;
  }
}

async function loadHolidayRequests(): Promise<any[]> {
  try {
    // Get all holidays with user information
    const holidayData = await db
      .select({
        id: holidays.id,
        employeeId: holidays.userId,
        employeeName: users.name,
        employeeEmail: users.email,
        department: departments.name,
        startDate: holidays.startDate,
        endDate: holidays.endDate,
        workingDays: holidays.workingDays,
        type: holidays.type,
        status: holidays.status,
        notes: holidays.notes,
        createdAt: holidays.createdAt,
        createdBy: users.email,
        approvedBy: holidays.approvedBy,
        approvedAt: holidays.approvedAt,
        rejectionReason: holidays.rejectionReason
      })
      .from(holidays)
      .innerJoin(users, eq(holidays.userId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .orderBy(desc(holidays.createdAt));

    // Convert to mock format for compatibility
    return holidayData.map(holiday => ({
      id: holiday.id,
      employeeId: holiday.employeeId,
      employeeName: holiday.employeeName,
      employeeEmail: holiday.employeeEmail,
      department: holiday.department || 'No Department',
      startDate: holiday.startDate,
      endDate: holiday.endDate,
      workingDays: holiday.workingDays,
      type: holiday.type,
      status: holiday.status,
      notes: holiday.notes || '',
      createdAt: holiday.createdAt.toISOString(),
      createdBy: holiday.createdBy,
      approvedBy: holiday.approvedBy,
      approvedAt: holiday.approvedAt?.toISOString(),
      rejectionReason: holiday.rejectionReason
    }));
  } catch (error) {
    console.error('Failed to load holiday requests:', error);
    return [];
  }
}

// ============================================
// SYSTEM SETTINGS OPERATIONS
// ============================================

async function saveSystemSettings(settingsData: any): Promise<void> {
  try {
    // Get admin user for settings updates (default to first admin)
    const adminUser = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(1);
    
    const adminId = adminUser[0]?.id;
    if (!adminId) {
      console.warn('No admin user found for settings update');
      return;
    }

    // Save each setting
    for (const [key, value] of Object.entries(settingsData)) {
      await upsertSetting(key, JSON.stringify(value), `System setting for ${key}`, adminId);
    }
  } catch (error) {
    console.error('Failed to save system settings:', error);
    throw error;
  }
}

async function loadSystemSettings(): Promise<any> {
  try {
    const settingsData = await db.select()
      .from(settings);

    const settingsMap: any = {};
    settingsData.forEach(setting => {
      try {
        settingsMap[setting.key] = JSON.parse(setting.value);
      } catch {
        settingsMap[setting.key] = setting.value;
      }
    });

    return {
      settings: settingsMap,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to load system settings:', error);
    return { settings: {} };
  }
}

// ============================================
// MEDICAL CERTIFICATE OPERATIONS
// ============================================

export async function updateHolidayRequestWithFileId(holidayRequestId: string, fileId: string): Promise<boolean> {
  try {
    // First get the current notes
    const currentHoliday = await db.select({ notes: holidays.notes })
      .from(holidays)
      .where(eq(holidays.id, holidayRequestId))
      .limit(1);
    
    const currentNotes = currentHoliday[0]?.notes || '';
    const updatedNotes = `${currentNotes}\nMedical Certificate: ${fileId}`.trim();

    await db.update(holidays)
      .set({ 
        notes: updatedNotes,
        updatedAt: new Date()
      })
      .where(eq(holidays.id, holidayRequestId));

    console.log(`Updated holiday request ${holidayRequestId} with file ID ${fileId}`);
    return true;
  } catch (error) {
    console.error('Failed to update holiday request with file ID:', error);
    return false;
  }
}

// ============================================
// HELPER FUNCTIONS FOR DATABASE OPERATIONS
// ============================================

export async function upsertSetting(
  key: string, 
  value: string, 
  description: string, 
  updatedBy: string
): Promise<Setting> {
  try {
    // Try to update existing setting
    const existing = await db.select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing.length > 0) {
      const result = await db.update(settings)
        .set({ 
          value, 
          updatedBy, 
          updatedAt: new Date() 
        })
        .where(eq(settings.key, key))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(settings)
        .values({
          key,
          value,
          description,
          updatedBy
        })
        .returning();
      return result[0];
    }
  } catch (error) {
    console.error('Failed to upsert setting:', error);
    throw error;
  }
}

// ============================================
// CLEANUP AND MAINTENANCE
// ============================================

export async function clearMockData(): Promise<void> {
  try {
    // Clear memory cache
    memoryCache = {};
    console.log('Mock data cache cleared');
  } catch (error) {
    console.error('Failed to clear mock data:', error);
  }
}

// ============================================
// ADDITIONAL DATABASE OPERATIONS
// ============================================

export async function getHolidaysByDateRange(startDate: string, endDate: string): Promise<Holiday[]> {
  try {
    return await db.select()
      .from(holidays)
      .where(
        and(
          gte(holidays.startDate, startDate),
          lte(holidays.endDate, endDate)
        )
      )
      .orderBy(holidays.startDate);
  } catch (error) {
    console.error('Failed to get holidays by date range:', error);
    return [];
  }
}

export async function getHolidaysByUserId(userId: string): Promise<Holiday[]> {
  try {
    return await db.select()
      .from(holidays)
      .where(eq(holidays.userId, userId))
      .orderBy(desc(holidays.createdAt));
  } catch (error) {
    console.error('Failed to get holidays by user ID:', error);
    return [];
  }
}

export async function getHolidaysByStatus(status: HolidayStatus): Promise<Holiday[]> {
  try {
    return await db.select()
      .from(holidays)
      .where(eq(holidays.status, status))
      .orderBy(desc(holidays.createdAt));
  } catch (error) {
    console.error('Failed to get holidays by status:', error);
    return [];
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Failed to get user by email:', error);
    return null;
  }
}

export async function createUser(userData: NewUser): Promise<User> {
  try {
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
}

export async function createHoliday(holidayData: NewHoliday): Promise<Holiday> {
  try {
    const result = await db.insert(holidays).values(holidayData).returning();
    return result[0];
  } catch (error) {
    console.error('Failed to create holiday:', error);
    throw error;
  }
}

export async function getDepartments(): Promise<Department[]> {
  try {
    return await db.select().from(departments);
  } catch (error) {
    console.error('Failed to get departments:', error);
    return [];
  }
}

export async function createDepartment(departmentData: NewDepartment): Promise<Department> {
  try {
    const result = await db.insert(departments).values(departmentData).returning();
    return result[0];
  } catch (error) {
    console.error('Failed to create department:', error);
    throw error;
  }
}

export async function getAllSettings(): Promise<Setting[]> {
  try {
    return await db.select().from(settings);
  } catch (error) {
    console.error('Failed to get all settings:', error);
    return [];
  }
}

export async function getSettingByKey(key: string): Promise<Setting | null> {
  try {
    const result = await db.select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Failed to get setting by key:', error);
    return null;
  }
}

// ============================================
// AUDIT LOGGING FOR GDPR COMPLIANCE
// ============================================

export async function createAuditLog(
  action: AuditLogAction,
  userId: string | null,
  details: any = {},
  targetUserId?: string,
  targetResourceId?: string,
  resourceType?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuditLog> {
  try {
    const auditData: NewAuditLog = {
      action,
      userId,
      targetUserId,
      targetResourceId,
      resourceType,
      details: JSON.stringify(details),
      ipAddress,
      userAgent
    };

    const result = await db.insert(auditLogs).values(auditData).returning();
    console.log(`Audit log created: ${action} by ${userId || 'system'}`);
    return result[0];
  } catch (error) {
    console.error('Failed to create audit log:', error);
    throw error;
  }
}

export async function getAuditLogsByUser(userId: string, limit: number = 50): Promise<AuditLog[]> {
  try {
    return await db.select()
      .from(auditLogs)
      .where(or(eq(auditLogs.userId, userId), eq(auditLogs.targetUserId, userId)))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get audit logs by user:', error);
    return [];
  }
}

export async function getAuditLogsByAction(action: AuditLogAction, limit: number = 100): Promise<AuditLog[]> {
  try {
    return await db.select()
      .from(auditLogs)
      .where(eq(auditLogs.action, action))
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get audit logs by action:', error);
    return [];
  }
}

export async function getRecentAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  try {
    return await db.select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);
  } catch (error) {
    console.error('Failed to get recent audit logs:', error);
    return [];
  }
}

// Enhanced operations with audit logging
export async function updateHolidayStatusWithAudit(
  holidayId: string, 
  status: HolidayStatus, 
  approvedBy: string, 
  notes?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    // Get the holiday details before update
    const holiday = await db.select()
      .from(holidays)
      .where(eq(holidays.id, holidayId))
      .limit(1);

    if (!holiday[0]) {
      throw new Error('Holiday not found');
    }

    // Update the holiday status
    await updateHolidayStatus(holidayId, status, approvedBy, notes);

    // Create audit log
    const action: AuditLogAction = status === 'approved' ? 'holiday_approved' : 'holiday_rejected';
    await createAuditLog(
      action,
      approvedBy,
      {
        holidayId,
        previousStatus: holiday[0].status,
        newStatus: status,
        notes
      },
      holiday[0].userId,
      holidayId,
      'holiday',
      ipAddress,
      userAgent
    );

    console.log(`Holiday status updated with audit: ${holidayId} -> ${status}`);
  } catch (error) {
    console.error('Failed to update holiday status with audit:', error);
    throw error;
  }
}

export async function updateEmployeeStatusWithAudit(
  employeeId: string, 
  status: UserStatus, 
  approvedBy: string, 
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    // Get the employee details before update
    const employee = await db.select()
      .from(users)
      .where(eq(users.id, employeeId))
      .limit(1);

    if (!employee[0]) {
      throw new Error('Employee not found');
    }

    // Update the employee status
    await updateEmployeeStatus(employeeId, status, approvedBy, reason);

    // Create audit log
    await createAuditLog(
      'user_status_changed',
      approvedBy,
      {
        employeeId,
        previousStatus: employee[0].status,
        newStatus: status,
        reason
      },
      employeeId,
      employeeId,
      'user',
      ipAddress,
      userAgent
    );

    console.log(`Employee status updated with audit: ${employeeId} -> ${status}`);
  } catch (error) {
    console.error('Failed to update employee status with audit:', error);
    throw error;
  }
}

export async function createHolidayWithAudit(
  holidayData: NewHoliday,
  ipAddress?: string,
  userAgent?: string
): Promise<Holiday> {
  try {
    const holiday = await createHoliday(holidayData);

    // Create audit log
    await createAuditLog(
      'holiday_created',
      holidayData.userId,
      {
        holidayId: holiday.id,
        startDate: holidayData.startDate,
        endDate: holidayData.endDate,
        type: holidayData.type,
        workingDays: holidayData.workingDays
      },
      holidayData.userId,
      holiday.id,
      'holiday',
      ipAddress,
      userAgent
    );

    return holiday;
  } catch (error) {
    console.error('Failed to create holiday with audit:', error);
    throw error;
  }
}

export async function createUserWithAudit(
  userData: NewUser,
  createdBy?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<User> {
  try {
    const user = await createUser(userData);

    // Create audit log
    await createAuditLog(
      'user_created',
      createdBy || user.id,
      {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        departmentId: userData.departmentId
      },
      user.id,
      user.id,
      'user',
      ipAddress,
      userAgent
    );

    return user;
  } catch (error) {
    console.error('Failed to create user with audit:', error);
    throw error;
  }
}

// Export the newHolidayRequests array for compatibility
export const newHolidayRequests: any[] = [];