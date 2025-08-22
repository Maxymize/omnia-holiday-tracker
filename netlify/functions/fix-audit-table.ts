import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

// Get database URL
function getDatabaseUrl(): string {
  return process.env.NETLIFY_DATABASE_URL_UNPOOLED || 
         process.env.DATABASE_URL_UNPOOLED || 
         process.env.NETLIFY_DATABASE_URL || 
         process.env.DATABASE_URL || '';
}

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  console.log('FIX-AUDIT-TABLE: Function started');
  
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
      throw new Error('No database URL found');
    }

    // Create SQL connection
    const db = neon(dbUrl);
    
    console.log('Creating audit_logs table if it doesn\'t exist...');
    
    // Create audit_logs table
    await db(`
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
    console.log('Audit logs table created or already exists');
    
    // Create index for better performance
    await db(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    `);
    console.log('Audit logs indexes created');
    
    // Test that we can query the table
    const result = await db('SELECT COUNT(*) as count FROM audit_logs');
    
    console.log('Table test successful, current audit log count:', result[0]?.count || 0);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Audit logs table created successfully',
        currentLogCount: result[0]?.count || 0,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error: any) {
    console.error('FIX-AUDIT-TABLE Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        type: error.constructor.name,
        timestamp: new Date().toISOString()
      })
    };
  }
};