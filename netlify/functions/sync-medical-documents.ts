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
    console.log('🔄 Starting sync of medical documents...');

    const sql = getDbConnection();
    const store = getStore('medical-certificates');

    // Get all blobs in the medical-certificates store
    console.log('📄 Listing all blobs in medical-certificates store...');
    const blobs = await store.list();
    console.log(`📋 Found ${blobs.blobs.length} blobs in Netlify Blobs`);

    if (blobs.blobs.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No documents found in Netlify Blobs to sync',
          synced: 0,
          blobsFound: 0
        })
      };
    }

    // Get existing records in database to avoid duplicates
    const existingRecords = await sql`
      SELECT file_id FROM medical_certificates
    `;
    const existingFileIds = new Set(existingRecords.map(r => r.file_id));

    let syncedCount = 0;
    const syncResults = [];

    // Process each blob
    for (const blob of blobs.blobs) {
      try {
        // Skip if already exists in database
        if (existingFileIds.has(blob.key)) {
          console.log(`⏭️ Skipping ${blob.key} - already exists in database`);
          continue;
        }

        // Try to get blob metadata (some might have it)
        console.log(`🔍 Processing blob: ${blob.key}`);
        const blobData = await store.get(blob.key);

        if (!blobData) {
          console.log(`⚠️ Could not retrieve blob data for ${blob.key}`);
          continue;
        }

        // Since we don't have original metadata, we'll create generic records
        // In a real scenario, this metadata should be stored with the blob
        const fileExtension = blob.key.includes('.') ? blob.key.split('.').pop()?.toLowerCase() : '';
        let mimeType = 'application/octet-stream';

        // Try to guess mime type from extension
        if (fileExtension === 'pdf') {
          mimeType = 'application/pdf';
        } else if (['jpg', 'jpeg'].includes(fileExtension || '')) {
          mimeType = 'image/jpeg';
        } else if (fileExtension === 'png') {
          mimeType = 'image/png';
        }

        // Create a generic record - note: we'll need to manually assign these to users and holidays
        const now = new Date().toISOString();

        await sql`
          INSERT INTO medical_certificates (
            file_id,
            holiday_request_id,
            original_file_name,
            mime_type,
            file_size,
            encrypted_data,
            encryption_method,
            uploaded_by,
            uploaded_at,
            created_at,
            updated_at
          ) VALUES (
            ${blob.key},
            ${'00000000-0000-0000-0000-000000000000'}, -- Placeholder UUID
            ${blob.key}, -- Using blob key as filename for now
            ${mimeType},
            ${blob.size || 0},
            'legacy_document', -- Placeholder for encrypted data
            'NONE', -- No encryption for legacy docs
            ${'00000000-0000-0000-0000-000000000000'}, -- Placeholder user UUID
            ${now},
            ${now},
            ${now}
          )
        `;

        syncedCount++;
        syncResults.push({
          fileId: blob.key,
          size: blob.size,
          mimeType: mimeType,
          status: 'synced'
        });

        console.log(`✅ Synced: ${blob.key} (${blob.size} bytes)`);

      } catch (error) {
        console.error(`❌ Failed to sync ${blob.key}:`, error);
        syncResults.push({
          fileId: blob.key,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`🎉 Sync completed: ${syncedCount}/${blobs.blobs.length} documents synced`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully synced ${syncedCount} documents from Netlify Blobs`,
        synced: syncedCount,
        blobsFound: blobs.blobs.length,
        results: syncResults,
        note: 'Legacy documents have placeholder user and holiday IDs. Update manually if needed.'
      })
    };

  } catch (error) {
    console.error('❌ Error syncing medical documents:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to sync documents',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};