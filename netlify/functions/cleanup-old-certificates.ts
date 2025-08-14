import { Handler, schedule } from '@netlify/functions';

// Use mock storage in development, real Netlify Blobs in production
// Detect development mode by checking multiple indicators  
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.NETLIFY_DEV === 'true' || 
                     !process.env.NETLIFY_SITE_ID;

const getStore = isDevelopment
  ? require('../../lib/mock-blob-storage').getStore
  : require('@netlify/blobs').getStore;

// Retention period in days (configurable via environment variable)
const RETENTION_DAYS = parseInt(process.env.MEDICAL_CERT_RETENTION_DAYS || '730'); // Default 2 years

/**
 * Scheduled function to clean up old medical certificates
 * Runs daily at 2 AM UTC
 */
const cleanupHandler: Handler = async (event, context) => {
  console.log('Starting medical certificate cleanup job...');
  
  try {
    // Get the blob store
    const store = getStore({
      name: 'medical-certificates',
      siteID: process.env.NETLIFY_SITE_ID
    });
    
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    // Get all blob IDs (in production, this would be paginated)
    const blobIds = await store.list();
    
    for (const blobId of blobIds) {
      try {
        // Get metadata to check upload date
        const metadata = await store.getMetadata(blobId);
        
        if (metadata && metadata.uploadedAt) {
          const uploadDate = new Date(metadata.uploadedAt as string);
          
          // Check if the certificate is older than retention period
          if (uploadDate < cutoffDate) {
            // Delete the blob
            await store.delete(blobId);
            deletedCount++;
            
            console.log(`Deleted old certificate: ${blobId} (uploaded: ${metadata.uploadedAt})`);
            
            // Log the deletion for audit purposes
            console.log('Audit log - Certificate deleted:', {
              blobId,
              originalName: metadata.originalName,
              uploadedBy: metadata.uploadedBy,
              uploadedAt: metadata.uploadedAt,
              deletedAt: new Date().toISOString(),
              reason: 'GDPR retention period expired'
            });
          }
        }
      } catch (error) {
        console.error(`Error processing blob ${blobId}:`, error);
        errorCount++;
      }
    }
    
    const summary = {
      success: true,
      message: 'Medical certificate cleanup completed',
      totalProcessed: blobIds.length,
      deletedCount,
      errorCount,
      retentionDays: RETENTION_DAYS,
      cutoffDate: cutoffDate.toISOString(),
      executedAt: new Date().toISOString()
    };
    
    console.log('Cleanup job summary:', summary);
    
    return {
      statusCode: 200,
      body: JSON.stringify(summary)
    };
    
  } catch (error) {
    console.error('Medical certificate cleanup failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: 'Cleanup job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date().toISOString()
      })
    };
  }
};

// Export as scheduled function (runs daily at 2 AM UTC)
export const handler = schedule("0 2 * * *", cleanupHandler);

// Also export for manual execution (can be triggered via API for testing)
export const manualHandler = cleanupHandler;