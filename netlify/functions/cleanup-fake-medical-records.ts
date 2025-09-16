import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

function getDbConnection() {
  const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
                process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('No database connection URL available');
  }

  console.log('🔧 Selected database URL source:', dbUrl.startsWith('postgresql://') ? 'NETLIFY_DATABASE_URL_UNPOOLED' : 'DATABASE_URL');

  // Clean up the URL to remove unsupported parameters for neon client
  let cleanedUrl = dbUrl;
  if (cleanedUrl.includes('channel_binding=require')) {
    console.log('🔧 Removing channel_binding parameter from connection string');
    cleanedUrl = cleanedUrl.replace(/[?&]channel_binding=require/, '');
    cleanedUrl = cleanedUrl.replace(/channel_binding=require[&]?/, '');
  }

  // Additional cleanup for malformed URLs
  cleanedUrl = cleanedUrl.replace(/&sslmode=require$/, '?sslmode=require');
  cleanedUrl = cleanedUrl.replace(/&&/g, '&');
  cleanedUrl = cleanedUrl.replace(/\?&/g, '?');

  try {
    const url = new URL(cleanedUrl);
    console.log('✅ Successfully cleaned URL using URL API');
  } catch (error) {
    console.log('⚠️ URL parsing failed, using original URL:', error);
    cleanedUrl = dbUrl;
  }

  console.log('🔧 Creating Neon client...');
  return neon(cleanedUrl);
}

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed - POST only' })
    };
  }

  try {
    console.log('🧹 Starting cleanup of fake medical certificate records...');

    const sql = getDbConnection();

    // First, let's see what we're about to delete
    const fakeRecords = await sql`
      SELECT id, file_id, original_file_name, holiday_request_id, uploaded_by
      FROM medical_certificates
      WHERE holiday_request_id = '00000000-0000-0000-0000-000000000000'
         OR uploaded_by = '00000000-0000-0000-0000-000000000000'
    `;

    console.log(`📋 Found ${fakeRecords.length} records with fake UUIDs:`, fakeRecords);

    if (fakeRecords.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No fake UUID records found to clean up',
          deletedCount: 0
        })
      };
    }

    // Delete the fake records
    const deleteResult = await sql`
      DELETE FROM medical_certificates
      WHERE holiday_request_id = '00000000-0000-0000-0000-000000000000'
         OR uploaded_by = '00000000-0000-0000-0000-000000000000'
    `;

    console.log('🗑️ Delete result:', deleteResult);

    // Verify cleanup
    const remainingFakeRecords = await sql`
      SELECT COUNT(*) as count
      FROM medical_certificates
      WHERE holiday_request_id = '00000000-0000-0000-0000-000000000000'
         OR uploaded_by = '00000000-0000-0000-0000-000000000000'
    `;

    const deletedCount = fakeRecords.length;
    const remainingCount = parseInt(remainingFakeRecords[0]?.count || '0');

    console.log(`✅ Cleanup completed: deleted ${deletedCount} fake records, ${remainingCount} remaining`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully cleaned up ${deletedCount} fake medical certificate records`,
        deletedRecords: fakeRecords.map(r => ({
          id: r.id,
          fileId: r.file_id,
          originalFileName: r.original_file_name
        })),
        deletedCount,
        remainingFakeRecords: remainingCount
      })
    };

  } catch (error) {
    console.error('❌ Error cleaning up fake medical records:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to cleanup fake records',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};