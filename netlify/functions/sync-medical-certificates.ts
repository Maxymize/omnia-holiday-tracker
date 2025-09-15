import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';
import { getMedicalCertificateStore } from '../../lib/storage/medical-certificates-blobs-manual';

// Initialize SQL client
const sql = neon(process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '');

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔄 Starting medical certificates synchronization...');

    // Get all holiday requests that have medical certificates in their notes
    const holidayRequests = await sql`
      SELECT
        id,
        employee_id,
        notes,
        created_at,
        type
      FROM holiday_requests
      WHERE notes LIKE '%Medical Certificate:%'
        AND type = 'sick'
    `;

    console.log(`📋 Found ${holidayRequests.length} holiday requests with medical certificates`);

    if (holidayRequests.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No medical certificates found to sync',
          synced: 0
        })
      };
    }

    let syncedCount = 0;
    let skippedCount = 0;
    const store = getMedicalCertificateStore();

    for (const request of holidayRequests) {
      try {
        // Extract file ID from notes
        const notes = request.notes || '';
        const match = notes.match(/Medical Certificate:\s*([a-f0-9]+)/i);

        if (!match) {
          console.log(`⚠️ No valid certificate ID found in request ${request.id}`);
          continue;
        }

        const fileId = match[1];
        console.log(`🔍 Processing certificate ${fileId} from request ${request.id}`);

        // Check if already exists in database
        const existing = await sql`
          SELECT id FROM medical_certificates WHERE id = ${fileId}
        `;

        if (existing.length > 0) {
          console.log(`⏭️ Certificate ${fileId} already exists in database, skipping`);
          skippedCount++;
          continue;
        }

        // Try to get certificate metadata from Netlify Blobs
        try {
          const blobData = await store.get(fileId, { type: 'text' });

          if (!blobData) {
            console.log(`❌ Certificate ${fileId} not found in Netlify Blobs, skipping`);
            continue;
          }

          const certificateData = JSON.parse(blobData);
          const metadata = certificateData.metadata;

          // Insert into database
          await sql`
            INSERT INTO medical_certificates (
              id,
              original_name,
              mime_type,
              file_size,
              uploaded_by,
              uploaded_at,
              holiday_request_id,
              storage_type,
              storage_location
            ) VALUES (
              ${fileId},
              ${metadata.originalName || 'Medical Certificate'},
              ${metadata.mimeType || 'application/pdf'},
              ${certificateData.content?.length || 0},
              ${request.employee_id},
              ${metadata.uploadedAt || request.created_at},
              ${request.id},
              'netlify_blobs',
              ${fileId}
            )
          `;

          console.log(`✅ Synced certificate ${fileId} for request ${request.id}`);
          syncedCount++;

        } catch (blobError) {
          console.error(`❌ Failed to process certificate ${fileId}:`, blobError);
          continue;
        }

      } catch (requestError) {
        console.error(`❌ Failed to process request ${request.id}:`, requestError);
        continue;
      }
    }

    console.log(`🎉 Synchronization completed: ${syncedCount} synced, ${skippedCount} skipped`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Synchronization completed successfully`,
        synced: syncedCount,
        skipped: skippedCount,
        total: holidayRequests.length
      })
    };

  } catch (error) {
    console.error('❌ Medical certificates sync error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to sync medical certificates',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};