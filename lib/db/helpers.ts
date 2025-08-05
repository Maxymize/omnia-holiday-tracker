import { db } from './index';
import { users, departments, holidays, settings } from './schema';
import { eq, and } from 'drizzle-orm';
import type { NewUser, NewDepartment, NewHoliday, NewSetting } from './schema';

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

// Test database connection
export async function testDatabaseConnection() {
  try {
    const result = await db.select().from(users).limit(1);
    return { success: true, message: 'Database connection successful' };
  } catch (error) {
    return { success: false, message: `Database connection failed: ${error}` };
  }
}