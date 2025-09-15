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
      body: JSON.stringify({ error: 'Method not allowed - GET only' })
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

    console.log('📊 Calculating storage usage...');

    const sql = getDbConnection();

    // Get total file sizes from database
    const storageStats = await sql`
      SELECT
        COUNT(*) as total_files,
        COALESCE(SUM(file_size), 0) as total_size_bytes,
        AVG(file_size) as average_file_size,
        MAX(file_size) as largest_file_size,
        MIN(file_size) as smallest_file_size
      FROM medical_certificates
    `;

    const stats = storageStats[0];

    // Try to get Netlify Blobs storage info (if available)
    let blobsStorageInfo = null;
    try {
      const store = getStore('medical-certificates');
      const blobs = await store.list();

      blobsStorageInfo = {
        total_blobs: blobs.blobs.length,
        // Note: Blob list doesn't include size info, we'd need to fetch each individually
        // This is approximated from database info
        estimated_total_size: Number(stats.total_size_bytes)
      };
    } catch (error) {
      console.warn('⚠️ Could not fetch Netlify Blobs info:', error);
      // This is expected in local development
    }

    // Calculate usage metrics
    const totalSizeBytes = Number(stats.total_size_bytes);
    const freeLimit = 100 * 1024 * 1024 * 1024; // 100 GB
    const usagePercentage = Math.round((totalSizeBytes / freeLimit) * 100);
    const remainingBytes = Math.max(0, freeLimit - totalSizeBytes);

    console.log(`📊 Storage usage calculated: ${totalSizeBytes} bytes (${usagePercentage}%)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        storage: {
          // Database statistics
          totalFiles: Number(stats.total_files),
          totalSizeBytes: totalSizeBytes,
          averageFileSize: Number(stats.average_file_size || 0),
          largestFileSize: Number(stats.largest_file_size || 0),
          smallestFileSize: Number(stats.smallest_file_size || 0),

          // Usage calculations
          usagePercentage: usagePercentage,
          remainingBytes: remainingBytes,
          freeLimit: freeLimit,

          // Status flags
          isNearLimit: usagePercentage >= 80,
          isCritical: usagePercentage >= 95,
          isFull: usagePercentage >= 100,

          // Formatted values for display
          formatted: {
            totalSize: formatBytes(totalSizeBytes),
            remainingSpace: formatBytes(remainingBytes),
            freeLimit: formatBytes(freeLimit),
            averageFileSize: formatBytes(Number(stats.average_file_size || 0))
          }
        },

        // Netlify Blobs info (if available)
        blobsInfo: blobsStorageInfo,

        // Metadata
        calculatedAt: new Date().toISOString(),
        source: 'database_analysis'
      })
    };

  } catch (error) {
    console.error('❌ Error calculating storage usage:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to calculate storage usage',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

// Utility function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}