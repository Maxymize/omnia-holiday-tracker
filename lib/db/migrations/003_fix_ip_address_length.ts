import { db } from '../index';

/**
 * Migration to fix ip_address column length in audit_logs table
 *
 * Problem: Production environments with IPv6 and multiple proxy IPs
 * can generate strings longer than 45 characters (e.g., 78+ chars)
 *
 * Example production IP: "2a02:26f7:bcd0:5e02:0:3000:0:7, 35.159.94.30, 3.72.28.210" (78 chars)
 * Current limit: VARCHAR(45)
 * New limit: VARCHAR(255) to accommodate long IP strings
 */
export async function up(): Promise<void> {
  console.log('Fixing ip_address column length in audit_logs table...');

  try {
    // Use raw SQL to alter the column type since Drizzle might not handle this automatically
    await db.execute(`ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE VARCHAR(255)`);

    console.log('✅ ip_address column length updated to VARCHAR(255)');

    // Create an audit log entry for this migration
    await db.execute(`
      INSERT INTO audit_logs (action, user_id, details, resource_type, ip_address, user_agent, timestamp)
      VALUES (
        'setting_updated',
        NULL,
        '{"migrationName":"003_fix_ip_address_length","description":"Fixed ip_address column length limit for production compatibility","previousLimit":"VARCHAR(45)","newLimit":"VARCHAR(255)"}',
        'system',
        '127.0.0.1',
        'Migration System',
        NOW()
      )
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  console.log('Rolling back ip_address column length fix...');

  try {
    // Revert to original size (WARNING: This could cause data loss if long IPs exist)
    await db.execute(`ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE VARCHAR(45)`);

    console.log('Rollback completed (WARNING: Long IP addresses may have been truncated)');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}