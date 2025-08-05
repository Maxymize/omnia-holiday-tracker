import { pgTable, text, timestamp, integer, boolean, pgEnum, uuid, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['employee', 'admin']);
export const userStatusEnum = pgEnum('user_status', ['pending', 'active', 'inactive']);
export const holidayTypeEnum = pgEnum('holiday_type', ['vacation', 'sick', 'personal']);
export const holidayStatusEnum = pgEnum('holiday_status', ['pending', 'approved', 'rejected', 'cancelled']);

// Departments Table (defined first to avoid circular reference)
export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  location: text('location'),
  managerId: uuid('manager_id'), // Will add reference after users table
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Users (Employees) Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('employee'),
  status: userStatusEnum('status').notNull().default('pending'),
  departmentId: uuid('department_id').references(() => departments.id),
  holidayAllowance: integer('holiday_allowance').notNull().default(20), // Annual holiday days
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Holiday Requests Table
export const holidays = pgTable('holidays', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  type: holidayTypeEnum('type').notNull().default('vacation'),
  status: holidayStatusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  workingDays: integer('working_days').notNull(), // Calculated working days
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// System Settings Table
export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedBy: uuid('updated_by').notNull().references(() => users.id),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  holidays: many(holidays),
  approvedHolidays: many(holidays, {
    relationName: 'approver',
  }),
  managedDepartment: one(departments, {
    fields: [users.id],
    references: [departments.managerId],
  }),
  settingsUpdates: many(settings),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  // Note: managerId relationship is managed through the relations, not foreign key
  // to avoid circular dependency during table creation
  manager: one(users, {
    fields: [departments.managerId],
    references: [users.id],
  }),
  employees: many(users),
}));

export const holidaysRelations = relations(holidays, ({ one }) => ({
  user: one(users, {
    fields: [holidays.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [holidays.approvedBy],
    references: [users.id],
    relationName: 'approver',
  }),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [settings.updatedBy],
    references: [users.id],
  }),
}));

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type Holiday = typeof holidays.$inferSelect;
export type NewHoliday = typeof holidays.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

// Enums for TypeScript
export type UserRole = typeof userRoleEnum.enumValues[number];
export type UserStatus = typeof userStatusEnum.enumValues[number];
export type HolidayType = typeof holidayTypeEnum.enumValues[number];
export type HolidayStatus = typeof holidayStatusEnum.enumValues[number];