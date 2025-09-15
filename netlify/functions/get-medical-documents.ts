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

  console.log('🔧 Validating cleaned URL...');
  const urlParts = cleanedUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/);
  if (urlParts) {
    console.log('✅ Database URL validation passed:', {
      protocol: 'postgresql:',
      hostname: urlParts[3],
      pathname: `/${urlParts[4].split('?')[0]}`,
      hasAuth: true,
      queryParams: urlParts[4].includes('?') ? urlParts[4].split('?')[1].split('&')[0] : 'none'
    });
  }

  console.log('🔧 Creating Neon client...');
  return neon(cleanedUrl);
}

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Simple auth check - in a real admin function we'd need more robust auth
    const authHeader = event.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Get query parameters for sorting
    const queryParams = event.queryStringParameters || {};
    const sortBy = queryParams.sortBy || 'uploadedAt';
    const sortOrder = queryParams.sortOrder || 'desc';

    const sql = getDbConnection();

    // Get all medical documents with user information
    let documents;

    switch (sortBy) {
      case 'uploadedAt':
        documents = sortOrder === 'asc'
          ? await sql`
              SELECT
                mc.id,
                mc.file_id as filename,
                mc.original_file_name,
                mc.file_size,
                mc.mime_type,
                mc.uploaded_at,
                mc.holiday_request_id,
                u.id as user_id,
                u.name as user_name,
                u.email as user_email
              FROM medical_certificates mc
              JOIN users u ON mc.uploaded_by = u.id
              ORDER BY mc.uploaded_at ASC
            `
          : await sql`
              SELECT
                mc.id,
                mc.file_id as filename,
                mc.original_file_name,
                mc.file_size,
                mc.mime_type,
                mc.uploaded_at,
                mc.holiday_request_id,
                u.id as user_id,
                u.name as user_name,
                u.email as user_email
              FROM medical_certificates mc
              JOIN users u ON mc.uploaded_by = u.id
              ORDER BY mc.uploaded_at DESC
            `;
        break;
      case 'uploadedBy':
        documents = sortOrder === 'asc'
          ? await sql`
              SELECT
                mc.id,
                mc.file_id as filename,
                mc.original_file_name,
                mc.file_size,
                mc.mime_type,
                mc.uploaded_at,
                mc.holiday_request_id,
                u.id as user_id,
                u.name as user_name,
                u.email as user_email
              FROM medical_certificates mc
              JOIN users u ON mc.uploaded_by = u.id
              ORDER BY u.name ASC
            `
          : await sql`
              SELECT
                mc.id,
                mc.file_id as filename,
                mc.original_file_name,
                mc.file_size,
                mc.mime_type,
                mc.uploaded_at,
                mc.holiday_request_id,
                u.id as user_id,
                u.name as user_name,
                u.email as user_email
              FROM medical_certificates mc
              JOIN users u ON mc.uploaded_by = u.id
              ORDER BY u.name DESC
            `;
        break;
      case 'fileName':
        documents = sortOrder === 'asc'
          ? await sql`
              SELECT
                mc.id,
                mc.file_id as filename,
                mc.original_file_name,
                mc.file_size,
                mc.mime_type,
                mc.uploaded_at,
                mc.holiday_request_id,
                u.id as user_id,
                u.name as user_name,
                u.email as user_email
              FROM medical_certificates mc
              JOIN users u ON mc.uploaded_by = u.id
              ORDER BY mc.original_file_name ASC
            `
          : await sql`
              SELECT
                mc.id,
                mc.file_id as filename,
                mc.original_file_name,
                mc.file_size,
                mc.mime_type,
                mc.uploaded_at,
                mc.holiday_request_id,
                u.id as user_id,
                u.name as user_name,
                u.email as user_email
              FROM medical_certificates mc
              JOIN users u ON mc.uploaded_by = u.id
              ORDER BY mc.original_file_name DESC
            `;
        break;
      case 'fileSize':
        documents = sortOrder === 'asc'
          ? await sql`
              SELECT
                mc.id,
                mc.file_id as filename,
                mc.original_file_name,
                mc.file_size,
                mc.mime_type,
                mc.uploaded_at,
                mc.holiday_request_id,
                u.id as user_id,
                u.name as user_name,
                u.email as user_email
              FROM medical_certificates mc
              JOIN users u ON mc.uploaded_by = u.id
              ORDER BY mc.file_size ASC
            `
          : await sql`
              SELECT
                mc.id,
                mc.file_id as filename,
                mc.original_file_name,
                mc.file_size,
                mc.mime_type,
                mc.uploaded_at,
                mc.holiday_request_id,
                u.id as user_id,
                u.name as user_name,
                u.email as user_email
              FROM medical_certificates mc
              JOIN users u ON mc.uploaded_by = u.id
              ORDER BY mc.file_size DESC
            `;
        break;
      default:
        documents = await sql`
          SELECT
            mc.id,
            mc.file_id as filename,
            mc.original_file_name,
            mc.file_size,
            mc.mime_type,
            mc.uploaded_at,
            mc.holiday_request_id,
            u.id as user_id,
            u.name as user_name,
            u.email as user_email
          FROM medical_certificates mc
          JOIN users u ON mc.uploaded_by = u.id
          ORDER BY mc.uploaded_at DESC
        `;
    }

    // Format the response
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      fileName: doc.filename,
      originalFileName: doc.original_file_name,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
      uploadedAt: doc.uploaded_at,
      uploadedBy: {
        id: doc.user_id,
        name: doc.user_name,
        email: doc.user_email
      },
      holidayRequestId: doc.holiday_request_id
    }));

    console.log(`📋 Retrieved ${formattedDocuments.length} medical documents`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        documents: formattedDocuments,
        total: formattedDocuments.length
      })
    };

  } catch (error) {
    console.error('❌ Error fetching medical documents:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch documents',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};