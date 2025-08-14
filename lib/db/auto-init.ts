import bcrypt from 'bcryptjs';
import { createUser, createDepartment, upsertSetting, createAuditLog } from './operations';
import { getUserByEmail, getDepartments, getAllSettings } from './helpers';

/**
 * Auto-initialize database with admin user and default data
 * This is called automatically on first admin login attempt
 */
export async function autoInitializeDatabase(): Promise<void> {
  try {
    console.log('🚀 Starting database auto-initialization...');
    
    // Check if admin user already exists
    const adminEmail = process.env.ADMIN_EMAIL || 'max.giurastante@omniaservices.net';
    const existingAdmin = await getUserByEmail(adminEmail);
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists, skipping initialization');
      return;
    }
    
    console.log('🔧 Creating admin user and initial data...');
    
    // Create admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const adminUser = await createUser({
      email: adminEmail,
      name: 'Massimiliano Giurastante',
      passwordHash: adminPasswordHash,
      role: 'admin',
      status: 'active',
      holidayAllowance: 25
    });
    
    console.log('✅ Admin user created:', adminUser.email);
    
    // Create default departments
    const departments = await getDepartments();
    if (departments.length === 0) {
      const itDept = await createDepartment({
        name: 'IT Development',
        location: 'Milan Office',
        managerId: adminUser.id
      });
      
      await createDepartment({
        name: 'Marketing',
        location: 'Rome Office'
      });
      
      await createDepartment({
        name: 'Human Resources',
        location: 'Milan Office'
      });
      
      console.log('✅ Default departments created');
      
      // Assign admin to IT department
      await createUser({
        email: adminUser.email,
        name: adminUser.name,
        passwordHash: adminUser.passwordHash,
        role: adminUser.role,
        status: adminUser.status,
        holidayAllowance: adminUser.holidayAllowance,
        departmentId: itDept.id
      });
    }
    
    // Create default system settings
    const settings = await getAllSettings();
    if (settings.length === 0) {
      await upsertSetting(
        'allowed_domains', 
        JSON.stringify(['omniaservices.net', 'omniaelectronics.com']),
        'Allowed email domains for OmniaGroup companies',
        adminUser.id
      );
      
      await upsertSetting(
        'holidays.visibility_mode',
        'admin_only',
        'Holiday visibility: admin_only, department_only, or all_see_all',
        adminUser.id
      );
      
      await upsertSetting(
        'holidays.approval_mode',
        'manual',
        'Holiday approval mode: manual or auto',
        adminUser.id
      );
      
      await upsertSetting(
        'notifications.email_enabled',
        'false',
        'Enable email notifications for holiday requests',
        adminUser.id
      );
      
      console.log('✅ Default system settings created');
    }
    
    // Log the initialization
    await createAuditLog(
      'user_created',
      adminUser.id,
      {
        reason: 'Database auto-initialization',
        adminEmail: adminUser.email,
        initialSetup: true
      },
      adminUser.id,
      adminUser.id,
      'system'
    );
    
    console.log('🎉 Database auto-initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database auto-initialization failed:', error);
    throw new Error(`Database initialization failed: ${error}`);
  }
}

/**
 * Check if database needs initialization
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'max.giurastante@omniaservices.net';
    const adminUser = await getUserByEmail(adminEmail);
    return !!adminUser;
  } catch (error) {
    console.error('Error checking database initialization:', error);
    return false;
  }
}