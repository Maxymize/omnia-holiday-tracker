import { Handler } from '@netlify/functions';
import { db } from '../../lib/db/index';
import { sql } from 'drizzle-orm';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('🔧 Applying database migration for medical certificate field...');

    // Apply the migration
    await db.execute(sql`
      ALTER TABLE holidays
      ADD COLUMN IF NOT EXISTS medical_certificate_file_id TEXT
    `);

    console.log('✅ Migration applied successfully');

    // Verify the column exists
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'holidays'
      AND column_name = 'medical_certificate_file_id'
    `);

    const columnExists = result.rows && result.rows.length > 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Migration applied successfully',
        columnExists,
        details: result.rows
      })
    };

  } catch (error) {
    console.error('❌ Migration error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};