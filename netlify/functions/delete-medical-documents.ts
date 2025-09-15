import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { getStore } from '@netlify/blobs';

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
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
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

  if (event.httpMethod !== 'DELETE') {
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

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { documentIds } = body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Document IDs are required and must be an array' })
      };
    }

    const sql = getDbConnection();

    // Get document details before deletion for blob cleanup
    const documentsToDelete = await sql`
      SELECT id, file_id, original_file_name
      FROM medical_certificates
      WHERE id = ANY(${documentIds})
    `;

    if (documentsToDelete.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No documents found with provided IDs' })
      };
    }

    // Initialize Netlify Blobs store
    const store = getStore('medical-certificates');

    // Track deletion results
    const deletionResults: {
      successful: Array<{ id: any; filename: string }>;
      failed: Array<{ id: any; filename: string; error: string }>;
    } = {
      successful: [],
      failed: []
    };

    // Delete documents from database and blobs
    for (const doc of documentsToDelete) {
      try {
        // Delete from database
        await sql`
          DELETE FROM medical_certificates
          WHERE id = ${doc.id}
        `;

        // Delete from Netlify Blobs
        try {
          await store.delete(doc.file_id);
          console.log(`✅ Deleted blob: ${doc.file_id}`);
        } catch (blobError) {
          console.warn(`⚠️ Failed to delete blob ${doc.file_id}:`, blobError);
          // Continue with deletion even if blob deletion fails
        }

        deletionResults.successful.push({
          id: doc.id,
          filename: doc.original_file_name
        });

        console.log(`✅ Successfully deleted document: ${doc.original_file_name} (ID: ${doc.id})`);

      } catch (error) {
        console.error(`❌ Failed to delete document ${doc.original_file_name} (ID: ${doc.id}):`, error);
        deletionResults.failed.push({
          id: doc.id,
          filename: doc.original_file_name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Prepare response based on results
    if (deletionResults.successful.length === documentIds.length) {
      console.log(`🎉 Successfully deleted ${deletionResults.successful.length} documents`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Successfully deleted ${deletionResults.successful.length} documents`,
          deletedCount: deletionResults.successful.length,
          deleted: deletionResults.successful
        })
      };
    } else if (deletionResults.successful.length > 0) {
      console.log(`⚠️ Partial deletion: ${deletionResults.successful.length}/${documentIds.length} documents deleted`);
      return {
        statusCode: 207, // Multi-Status
        headers,
        body: JSON.stringify({
          success: true,
          message: `Partially completed: ${deletionResults.successful.length}/${documentIds.length} documents deleted`,
          deletedCount: deletionResults.successful.length,
          deleted: deletionResults.successful,
          failed: deletionResults.failed
        })
      };
    } else {
      console.log(`❌ Failed to delete any documents`);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Failed to delete any documents',
          deletedCount: 0,
          failed: deletionResults.failed
        })
      };
    }

  } catch (error) {
    console.error('❌ Error deleting medical documents:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete documents',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};