import { db } from '../index';
import { auditLogs } from '../schema';

/**
 * Migration to add audit logs table for GDPR compliance
 * This tracks all admin actions and data access for compliance purposes
 */
export async function up(): Promise<void> {
  console.log('Running audit logs migration...');
  
  try {
    // The audit logs table will be automatically created by Drizzle on first access
    // We'll just verify it exists and add some initial audit entries for the migration itself
    console.log('Creating initial audit log entries...');
    
    // Create an audit log entry for the migration itself
    await db.insert(auditLogs).values({
      action: 'setting_updated',
      userId: null, // System action
      details: JSON.stringify({
        migrationName: '002_audit_logs',
        description: 'Added audit logging system for GDPR compliance',
        timestamp: new Date().toISOString()
      }),
      resourceType: 'system',
      ipAddress: '127.0.0.1',
      userAgent: 'Migration System'
    });
    
    console.log('Audit logs migration completed successfully!');
  } catch (error) {
    console.error('Audit logs migration failed:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  console.log('Rolling back audit logs migration...');
  
  try {
    // Delete all audit log entries
    await db.delete(auditLogs);
    
    console.log('Audit logs migration rollback completed');
  } catch (error) {
    console.error('Audit logs migration rollback failed:', error);
    throw error;
  }
}