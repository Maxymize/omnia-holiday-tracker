import { db } from '../index';
import { users, departments, holidays, settings } from '../schema';
import bcrypt from 'bcryptjs';

/**
 * Initial database schema creation and seeding
 * This migration creates all tables and seeds initial data
 */
export async function up(): Promise<void> {
  console.log('Running initial schema migration...');
  
  try {
    // Tables are automatically created by Drizzle when first accessed
    // We'll seed initial data here
    
    console.log('Seeding initial departments...');
    const initialDepartments = [
      { name: 'IT Development', location: 'Milan' },
      { name: 'Marketing', location: 'Milan' },
      { name: 'Sales', location: 'Rome' },
      { name: 'HR', location: 'Milan' },
      { name: 'Operations', location: 'Milan' },
      { name: 'Design', location: 'Milan' },
      { name: 'Finance', location: 'Rome' },
      { name: 'Customer Service', location: 'Milan' },
      { name: 'Legal', location: 'Rome' },
      { name: 'R&D', location: 'Milan' }
    ];

    const createdDepartments = await db.insert(departments)
      .values(initialDepartments)
      .returning();

    console.log(`Created ${createdDepartments.length} departments`);

    // Create admin user
    console.log('Creating admin user...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    
    const adminUser = await db.insert(users).values({
      email: 'max.giurastante@omniaservices.net',
      name: 'Massimiliano Giurastante',
      passwordHash: adminPasswordHash,
      role: 'admin',
      status: 'active',
      departmentId: createdDepartments[0].id, // IT Development
      holidayAllowance: 25
    }).returning();

    console.log('Created admin user:', adminUser[0].email);

    // Create sample employees
    console.log('Creating sample employees...');
    const sampleEmployees = [
      {
        email: 'mario.rossi@omniaservices.net',
        name: 'Mario Rossi',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'employee' as const,
        status: 'active' as const,
        departmentId: createdDepartments[0].id, // IT Development
        holidayAllowance: 22
      },
      {
        email: 'giulia.bianchi@omniaservices.net',
        name: 'Giulia Bianchi',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'employee' as const,
        status: 'active' as const,
        departmentId: createdDepartments[1].id, // Marketing
        holidayAllowance: 20
      },
      {
        email: 'luca.verdi@omniaservices.net',
        name: 'Luca Verdi',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'employee' as const,
        status: 'pending' as const,
        departmentId: createdDepartments[2].id, // Sales
        holidayAllowance: 20
      }
    ];

    const createdEmployees = await db.insert(users)
      .values(sampleEmployees)
      .returning();

    console.log(`Created ${createdEmployees.length} sample employees`);

    // Create initial system settings
    console.log('Creating initial system settings...');
    const initialSettings = [
      {
        key: 'allowed_domains',
        value: JSON.stringify(['omniaservices.net', 'omniaelectronics.com']),
        description: 'Allowed email domains for registration',
        updatedBy: adminUser[0].id
      },
      {
        key: 'holidays.visibility_mode',
        value: 'all_see_all',
        description: 'Holiday visibility mode: all_see_all, department_only, or admin_only',
        updatedBy: adminUser[0].id
      },
      {
        key: 'holidays.approval_mode',
        value: 'manual',
        description: 'Holiday approval mode: manual or auto',
        updatedBy: adminUser[0].id
      },
      {
        key: 'holidays.show_names',
        value: 'true',
        description: 'Show employee names in holiday calendar',
        updatedBy: adminUser[0].id
      },
      {
        key: 'holidays.show_details',
        value: 'false',
        description: 'Show holiday details to all employees',
        updatedBy: adminUser[0].id
      }
    ];

    const createdSettings = await db.insert(settings)
      .values(initialSettings)
      .returning();

    console.log(`Created ${createdSettings.length} system settings`);

    // Create sample holiday requests
    console.log('Creating sample holiday requests...');
    const sampleHolidays = [
      {
        userId: createdEmployees[0].id,
        startDate: '2025-08-15',
        endDate: '2025-08-19',
        type: 'vacation' as const,
        status: 'pending' as const,
        notes: 'Summer vacation',
        workingDays: 5
      },
      {
        userId: createdEmployees[1].id,
        startDate: '2025-08-22',
        endDate: '2025-08-26',
        type: 'vacation' as const,
        status: 'approved' as const,
        notes: 'Family vacation',
        workingDays: 5,
        approvedBy: adminUser[0].id,
        approvedAt: new Date()
      },
      {
        userId: createdEmployees[0].id,
        startDate: '2025-09-02',
        endDate: '2025-09-02',
        type: 'sick' as const,
        status: 'approved' as const,
        notes: 'Medical appointment',
        workingDays: 1,
        approvedBy: adminUser[0].id,
        approvedAt: new Date()
      }
    ];

    const createdHolidays = await db.insert(holidays)
      .values(sampleHolidays)
      .returning();

    console.log(`Created ${createdHolidays.length} sample holiday requests`);
    console.log('Initial schema migration completed successfully!');

  } catch (error) {
    console.error('Initial schema migration failed:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  console.log('Rolling back initial schema migration...');
  
  try {
    // Delete in reverse order due to foreign key constraints
    await db.delete(holidays);
    await db.delete(settings);
    await db.delete(users);
    await db.delete(departments);
    
    console.log('Initial schema rollback completed');
  } catch (error) {
    console.error('Initial schema rollback failed:', error);
    throw error;
  }
}