#!/usr/bin/env ts-node

import { db } from '../lib/db/index';
import { sql } from 'drizzle-orm';

async function createAuditTable() {
  console.log('Creating audit_logs table...');
  
  try {
    // Create audit_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(100) NOT NULL,
        user_id UUID REFERENCES users(id),
        target_user_id UUID REFERENCES users(id),
        target_resource_id VARCHAR(255),
        resource_type VARCHAR(50),
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('✅ Audit logs table created successfully');
    
    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    `);
    
    console.log('✅ Audit logs indexes created successfully');
    
    // Test the table
    const result: any = await db.execute(sql`SELECT COUNT(*) as count FROM audit_logs`);
    console.log('✅ Table test successful. Current log count:', result[0]?.count || 0);
    
  } catch (error) {
    console.error('❌ Error creating audit table:', error);
    process.exit(1);
  }
}

createAuditTable().then(() => {
  console.log('✅ Audit table creation completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});