import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { db, users, departments, holidays, settings } from './index';
import type { User, Department, Holiday, Setting, NewUser, NewHoliday, NewDepartment, NewSetting } from './schema';

// User helpers
export async function createUser(userData: NewUser): Promise<User> {
  const result = await db.insert(users).values(userData).returning();
  return result[0];
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserById(id: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserStatus(id: string, status: 'pending' | 'active' | 'inactive'): Promise<User> {
  const result = await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, id)).returning();
  return result[0];
}

export async function getPendingUsers(): Promise<User[]> {
  return await db.select().from(users).where(eq(users.status, 'pending')).orderBy(asc(users.createdAt));
}

export async function getActiveUsers(): Promise<User[]> {
  return await db.select().from(users).where(eq(users.status, 'active')).orderBy(asc(users.name));
}

// Department helpers
export async function createDepartment(departmentData: NewDepartment): Promise<Department> {
  const result = await db.insert(departments).values(departmentData).returning();
  return result[0];
}

export async function getAllDepartments(): Promise<Department[]> {
  return await db.select().from(departments).orderBy(asc(departments.name));
}

export async function getDepartmentById(id: string): Promise<Department | undefined> {
  const result = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return result[0];
}

export async function assignUserToDepartment(userId: string, departmentId: string): Promise<User> {
  const result = await db.update(users).set({ departmentId, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
  return result[0];
}

// Holiday helpers
export async function createHoliday(holidayData: NewHoliday): Promise<Holiday> {
  const result = await db.insert(holidays).values(holidayData).returning();
  return result[0];
}

export async function getHolidaysByUserId(userId: string): Promise<Holiday[]> {
  return await db.select().from(holidays).where(eq(holidays.userId, userId)).orderBy(desc(holidays.createdAt));
}

export async function getHolidayById(id: string): Promise<Holiday | undefined> {
  const result = await db.select().from(holidays).where(eq(holidays.id, id)).limit(1);
  return result[0];
}

export async function getPendingHolidays(): Promise<Holiday[]> {
  return await db.select().from(holidays).where(eq(holidays.status, 'pending')).orderBy(asc(holidays.createdAt));
}

export async function approveHoliday(id: string, approvedBy: string): Promise<Holiday> {
  const result = await db.update(holidays).set({
    status: 'approved',
    approvedBy,
    approvedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(holidays.id, id)).returning();
  return result[0];
}

export async function rejectHoliday(id: string, approvedBy: string, rejectionReason?: string): Promise<Holiday> {
  const result = await db.update(holidays).set({
    status: 'rejected',
    approvedBy,
    approvedAt: new Date(),
    rejectionReason,
    updatedAt: new Date(),
  }).where(eq(holidays.id, id)).returning();
  return result[0];
}

export async function getHolidaysInDateRange(startDate: Date, endDate: Date): Promise<Holiday[]> {
  return await db.select().from(holidays).where(
    and(
      gte(holidays.startDate, startDate.toISOString().split('T')[0]),
      lte(holidays.endDate, endDate.toISOString().split('T')[0]),
      eq(holidays.status, 'approved')
    )
  ).orderBy(asc(holidays.startDate));
}

export async function checkHolidayOverlap(userId: string, startDate: string, endDate: string, excludeId?: string): Promise<Holiday[]> {
  let query = db.select().from(holidays).where(
    and(
      eq(holidays.userId, userId),
      // Check for any overlap: new start <= existing end AND new end >= existing start
      lte(holidays.startDate, endDate),
      gte(holidays.endDate, startDate),
      // Only check non-rejected holidays
      eq(holidays.status, 'approved')
    )
  );

  // Exclude specific holiday if provided (for edits)
  if (excludeId) {
    query = db.select().from(holidays).where(
      and(
        eq(holidays.userId, userId),
        lte(holidays.startDate, endDate),
        gte(holidays.endDate, startDate),
        eq(holidays.status, 'approved')
      )
    );
  }

  return await query;
}

// Settings helpers
export async function getSetting(key: string): Promise<Setting | undefined> {
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0];
}

export async function updateSetting(key: string, value: string, updatedBy: string, description?: string): Promise<Setting> {
  // Try to update first
  const updateResult = await db.update(settings).set({
    value,
    description,
    updatedBy,
    updatedAt: new Date(),
  }).where(eq(settings.key, key)).returning();

  // If no rows were updated, create new setting
  if (updateResult.length === 0) {
    const insertResult = await db.insert(settings).values({
      key,
      value,
      description,
      updatedBy,
    }).returning();
    return insertResult[0];
  }

  return updateResult[0];
}

export async function getAllSettings(): Promise<Setting[]> {
  return await db.select().from(settings).orderBy(asc(settings.key));
}

// Utility functions
export async function calculateWorkingDays(startDate: string, endDate: string): Promise<number> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    // Monday (1) to Friday (5) are working days
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
}

export async function getUserHolidayBalance(userId: string): Promise<{ allowance: number; used: number; available: number }> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Get current year holidays
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  const approvedHolidays = await db.select().from(holidays).where(
    and(
      eq(holidays.userId, userId),
      eq(holidays.status, 'approved'),
      gte(holidays.startDate, yearStart),
      lte(holidays.endDate, yearEnd)
    )
  );

  const usedDays = approvedHolidays.reduce((total, holiday) => total + holiday.workingDays, 0);
  
  return {
    allowance: user.holidayAllowance,
    used: usedDays,
    available: user.holidayAllowance - usedDays,
  };
}