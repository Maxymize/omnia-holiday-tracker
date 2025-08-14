import { db } from './index';
import { users, departments, holidays, settings, auditLogs } from './schema';
import { eq, and, inArray, ilike, or, desc } from 'drizzle-orm';
import type { NewUser, NewDepartment, NewHoliday, NewSetting, NewAuditLog, AuditLog, AuditLogAction } from './schema';

// User helpers
export async function createUser(userData: NewUser) {
  const result = await db.insert(users).values(userData).returning();
  return result[0];
}

export async function getUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] || null;
}

export async function getUserById(id: string) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

export async function updateUserStatus(id: string, status: 'pending' | 'active' | 'inactive') {
  const result = await db.update(users).set({ status }).where(eq(users.id, id)).returning();
  return result[0];
}

// Department helpers
export async function createDepartment(departmentData: NewDepartment) {
  const result = await db.insert(departments).values(departmentData).returning();
  return result[0];
}

export async function getDepartments() {
  return await db.select().from(departments);
}

export async function getDepartmentById(id: string) {
  const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return result[0] || null;
}

// Holiday helpers
export async function createHoliday(holidayData: NewHoliday) {
  const result = await db.insert(holidays).values(holidayData).returning();
  return result[0];
}

export async function getHolidaysByUserId(userId: string) {
  return await db.select().from(holidays).where(eq(holidays.userId, userId));
}

export async function updateHolidayStatus(
  id: string, 
  status: 'pending' | 'approved' | 'rejected' | 'cancelled',
  approvedBy?: string,
  rejectionReason?: string
) {
  const updateData: any = { 
    status,
    approvedAt: status === 'approved' ? new Date() : null
  };
  
  if (approvedBy) updateData.approvedBy = approvedBy;
  if (rejectionReason) updateData.rejectionReason = rejectionReason;
  
  const result = await db.update(holidays).set(updateData).where(eq(holidays.id, id)).returning();
  return result[0];
}

// Settings helpers
export async function createSetting(settingData: NewSetting) {
  const result = await db.insert(settings).values(settingData).returning();
  return result[0];
}

export async function getSettingByKey(key: string) {
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0] || null;
}

export async function updateSetting(key: string, value: string, updatedBy: string) {
  const result = await db.update(settings)
    .set({ value, updatedBy, updatedAt: new Date() })
    .where(eq(settings.key, key))
    .returning();
  return result[0];
}

// Additional department helpers (removing duplicates from above)
export async function getDepartmentByName(name: string) {
  const result = await db.select().from(departments).where(eq(departments.name, name)).limit(1);
  return result[0] || null;
}

export async function updateDepartment(id: string, updateData: Partial<NewDepartment>) {
  const result = await db.update(departments)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(departments.id, id))
    .returning();
  return result[0];
}

export async function deleteDepartment(id: string) {
  const result = await db.delete(departments).where(eq(departments.id, id)).returning();
  return result[0];
}

// Additional settings helpers
export async function getAllSettings() {
  return await db.select().from(settings);
}

export async function upsertSetting(key: string, value: string, description: string, updatedBy: string) {
  const existing = await getSettingByKey(key);
  
  if (existing) {
    return await updateSetting(key, value, updatedBy);
  } else {
    return await createSetting({
      key,
      value,
      description,
      updatedBy
    });
  }
}

export async function getSettingsByKeys(keys: string[]) {
  const result = await db.select().from(settings).where(inArray(settings.key, keys));
  return result;
}

// Additional user management helpers
export async function getAllUsers() {
  return await db.select().from(users);
}

export async function getUsersByStatus(status: 'pending' | 'active' | 'inactive') {
  return await db.select().from(users).where(eq(users.status, status));
}

export async function getUsersByRole(role: 'employee' | 'admin') {
  return await db.select().from(users).where(eq(users.role, role));
}

export async function getUsersByDepartment(departmentId: string) {
  return await db.select().from(users).where(eq(users.departmentId, departmentId));
}

export async function updateUserProfile(id: string, updateData: Partial<NewUser>) {
  const result = await db.update(users)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return result[0];
}

export async function updateUserHolidayAllowance(id: string, holidayAllowance: number) {
  const result = await db.update(users)
    .set({ holidayAllowance, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return result[0];
}

export async function updateUserLastLogin(id: string) {
  const result = await db.update(users)
    .set({ updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return result[0];
}

export async function searchUsersByNameOrEmail(searchTerm: string) {
  const term = `%${searchTerm.toLowerCase()}%`;
  return await db.select().from(users).where(
    or(
      ilike(users.name, term),
      ilike(users.email, term)
    )
  );
}

// Audit log helpers
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
  return result[0];
}

export async function getRecentAuditLogs(limit: number = 50): Promise<AuditLog[]> {
  return await db.select().from(auditLogs)
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

export async function getAuditLogsByUser(userId: string, limit: number = 50): Promise<AuditLog[]> {
  return await db.select().from(auditLogs)
    .where(or(eq(auditLogs.userId, userId), eq(auditLogs.targetUserId, userId)))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

export async function getAuditLogsByAction(action: AuditLogAction, limit: number = 100): Promise<AuditLog[]> {
  return await db.select().from(auditLogs)
    .where(eq(auditLogs.action, action))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

// Test database connection
export async function testDatabaseConnection() {
  try {
    const result = await db.select().from(users).limit(1);
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    return { success: false, message: `Database connection failed: ${error}` };
  }
}