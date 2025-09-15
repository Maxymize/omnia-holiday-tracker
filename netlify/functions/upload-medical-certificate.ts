import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';
import { updateHolidayRequestWithFileId } from '../../lib/db/operations';
import { neon } from '@neondatabase/serverless';

// Initialize SQL client
const sql = neon(process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || '');
// Try Netlify Blobs with manual config, fallback to database if needed
import { storeMedicalCertificateWithBlobs } from '../../lib/storage/medical-certificates-blobs-manual';
import { storeMedicalCertificateInDB } from '../../lib/storage/medical-certificates-db';
import { isStorageFull, NETLIFY_BLOBS_LIMITS } from '../../lib/utils/netlify-blobs-limits';

// Validation schemas
const uploadCertificateSchema = z.object({
  fileName: z.string().min(1, 'Nome file richiesto'),
  fileType: z.string().min(1, 'Tipo di file richiesto'),
  holidayRequestId: z.string().uuid('ID richiesta ferie non valido'),
  contentLength: z.number().min(1, 'Dimensione file richiesta'),
  fileData: z.string().optional() // Base64 data opzionale
});

// CORS headers - Match working create-holiday-request function
const headers = {
  'Access-Control-Allow-Origin': 'https://holiday.omniaelectronics.com',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Helper function to check current storage usage
async function checkStorageQuota(fileSize: number): Promise<{ allowed: boolean; error?: string }> {
  try {
    // Get current storage usage from database
    const storageStats = await sql`
      SELECT COALESCE(SUM(file_size), 0) as total_size_bytes
      FROM medical_certificates
    `;

    const currentUsage = parseInt(storageStats[0]?.total_size_bytes || '0');
    const newTotal = currentUsage + fileSize;

    console.log('📊 Storage check:', {
      currentUsage: `${(currentUsage / (1024 * 1024 * 1024)).toFixed(2)} GB`,
      fileSize: `${(fileSize / (1024 * 1024 * 1024)).toFixed(2)} GB`,
      newTotal: `${(newTotal / (1024 * 1024 * 1024)).toFixed(2)} GB`,
      limit: `${(NETLIFY_BLOBS_LIMITS.FREE_TIER_STORAGE / (1024 * 1024 * 1024)).toFixed(2)} GB`,
      wouldExceed: newTotal > NETLIFY_BLOBS_LIMITS.FREE_TIER_STORAGE
    });

    // Check if new upload would exceed storage limit
    if (newTotal > NETLIFY_BLOBS_LIMITS.FREE_TIER_STORAGE) {
      return {
        allowed: false,
        error: `Upload rifiutato: superamento limite storage (${(NETLIFY_BLOBS_LIMITS.FREE_TIER_STORAGE / (1024 * 1024 * 1024)).toFixed(0)} GB). Spazio utilizzato: ${(currentUsage / (1024 * 1024 * 1024)).toFixed(2)} GB, dimensione file: ${(fileSize / (1024 * 1024 * 1024)).toFixed(2)} GB.`
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('❌ Storage quota check failed:', error);
    // Allow upload if we can't check storage (fail open)
    return { allowed: true };
  }
}

// Process file upload with secure encryption
async function processCertificateUpload(
  fileName: string, 
  fileType: string, 
  holidayRequestId: string, 
  contentLength: number,
  fileData: string,
  uploadedBy: string
) {
  try {
    // Debug: Log environment check
    console.log('🔍 Environment debug:', {
      hasEncryptionKey: !!process.env.MEDICAL_CERT_ENCRYPTION_KEY,
      hasRetentionDays: !!process.env.MEDICAL_CERT_RETENTION_DAYS,
      nodeEnv: process.env.NODE_ENV
    });

    // Validate that file data is provided
    if (!fileData) {
      console.error('❌ File data missing in request');
      throw new Error('Dati del file mancanti');
    }

    // Convert base64 file data to buffer
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(fileData, 'base64');
      console.log('✅ Base64 conversion successful, buffer size:', fileBuffer.length);
    } catch (error) {
      console.error('❌ Base64 conversion failed:', error);
      throw new Error('Dati del file non validi (formato base64 richiesto)');
    }

    // Verify file size matches content length
    if (fileBuffer.length !== contentLength) {
      console.error('❌ Size mismatch:', { bufferLength: fileBuffer.length, expectedLength: contentLength });
      throw new Error('Dimensione del file non corrisponde ai dati forniti');
    }

    console.log('🔐 Processing secure upload:', {
      fileName,
      fileType,
      contentLength,
      holidayRequestId,
      uploadedBy,
      actualBufferSize: fileBuffer.length
    });

    // Try Netlify Blobs first with manual configuration
    console.log('🔍 Attempting Netlify Blobs storage with manual config...');
    let storageResult;

    try {
      storageResult = await storeMedicalCertificateWithBlobs(
        fileBuffer,
        fileName,
        fileType,
        uploadedBy,
        holidayRequestId
      );

      if (!storageResult.success) {
        throw new Error(storageResult.message);
      }

      console.log('✅ Netlify Blobs storage successful');
    } catch (blobError) {
      console.error('❌ Netlify Blobs failed, falling back to database:', blobError);

      // Fallback to database storage
      storageResult = await storeMedicalCertificateInDB(
        fileBuffer,
        fileName,
        fileType,
        uploadedBy,
        holidayRequestId,
        uploadedBy // Using email as uploadedById for now
      );

      if (!storageResult.success) {
        throw new Error(`Both storage methods failed. Blobs: ${blobError instanceof Error ? blobError.message : 'Unknown'}. DB: ${storageResult.message}`);
      }

      console.log('✅ Database storage successful (fallback)');
    }

    console.log('✅ Certificate stored securely with ID:', storageResult.fileId);

    if (!storageResult.fileId) {
      throw new Error('File ID non generato durante il salvataggio');
    }

    return {
      success: true,
      fileId: storageResult.fileId,
      message: 'Certificato medico crittografato e salvato con successo',
      metadata: {
        originalFileName: fileName,
        fileType,
        fileSize: contentLength,
        holidayRequestId,
        uploadedAt: new Date().toISOString(),
        status: 'encrypted_and_stored',
        secureFileId: storageResult.fileId
      }
    };

  } catch (error) {
    console.error('❌ Secure certificate upload error:', error);
    throw error;
  }
}

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests - exact same check as create-holiday-request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // DEBUG: Log all headers exactly like create-holiday-request
    console.log('🔍 UPLOAD-MEDICAL DEBUG Headers:', {
      cookie: event.headers.cookie,
      authorization: event.headers.authorization,
      userAgent: event.headers['user-agent']
    });

    // Verify authentication - EXACT same pattern as create-holiday-request
    let userToken;
    try {
      console.log('🔍 UPLOAD-MEDICAL: Step 1 - Calling verifyAuthFromRequest...');
      userToken = await verifyAuthFromRequest(event);
      console.log('✅ UPLOAD-MEDICAL: Step 1 SUCCESS - verifyAuthFromRequest worked');
    } catch (authError: any) {
      console.error('❌ UPLOAD-MEDICAL: Step 1 FAILED - verifyAuthFromRequest error:', authError);
      throw new Error(`Authentication step 1 failed: ${authError.message}`);
    }

    try {
      console.log('🔍 UPLOAD-MEDICAL: Step 2 - Calling requireAccessToken...');
      requireAccessToken(userToken);
      console.log('✅ UPLOAD-MEDICAL: Step 2 SUCCESS - requireAccessToken worked');
    } catch (requireError: any) {
      console.error('❌ UPLOAD-MEDICAL: Step 2 FAILED - requireAccessToken error:', requireError);
      throw new Error(`Authentication step 2 failed: ${requireError.message}`);
    }

    console.log('✅ UPLOAD-MEDICAL: Authentication successful for user:', userToken.userId);
    
    console.log('🏥 Processing medical certificate upload for user:', userToken.userId);

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Richiesta non valida',
          message: 'Corpo della richiesta JSON non valido' 
        })
      };
    }

    // Validate request data
    const validatedData = uploadCertificateSchema.parse(requestBody);
    console.log('📋 Upload request validated:', {
      fileName: validatedData.fileName,
      fileType: validatedData.fileType,
      holidayRequestId: validatedData.holidayRequestId,
      contentLength: validatedData.contentLength
    });

    // Check storage quota before processing upload
    const storageCheck = await checkStorageQuota(validatedData.contentLength);
    if (!storageCheck.allowed) {
      console.log('🚫 Upload blocked due to storage limit exceeded');
      return {
        statusCode: 413, // Payload Too Large
        headers,
        body: JSON.stringify({
          error: 'Limite di storage superato',
          message: storageCheck.error
        })
      };
    }

    // Process the certificate upload
    const uploadResult = await processCertificateUpload(
      validatedData.fileName,
      validatedData.fileType,
      validatedData.holidayRequestId,
      validatedData.contentLength,
      validatedData.fileData || '',
      userToken.email
    );

    console.log('✅ Certificate upload successful:', uploadResult.fileId);

    // Update the holiday request with the file ID
    if (!uploadResult.fileId) {
      throw new Error('File ID non ricevuto dal processo di upload');
    }

    const dbUpdateSuccess = await updateHolidayRequestWithFileId(
      validatedData.holidayRequestId,
      uploadResult.fileId
    );

    if (!dbUpdateSuccess) {
      console.error('❌ Failed to update holiday request with file ID');
      throw new Error('Errore durante l\'aggiornamento della richiesta con il certificato medico');
    }

    console.log('✅ Holiday request updated with certificate:', validatedData.holidayRequestId);

    // Check storage usage after upload and trigger alerts if needed
    try {
      console.log('📊 Checking storage usage after upload for automatic alerts...');

      // Get updated storage usage
      const storageStats = await sql`
        SELECT COALESCE(SUM(file_size), 0) as total_size_bytes
        FROM medical_certificates
      `;

      const currentUsage = parseInt(storageStats[0]?.total_size_bytes || '0');
      const NETLIFY_BLOBS_LIMITS = {
        FREE_TIER_STORAGE: 100 * 1024 * 1024 * 1024, // 100 GB in bytes
        WARNING_THRESHOLD: 0.8,
        CRITICAL_THRESHOLD: 0.95
      };

      const usagePercentage = Math.round((currentUsage / NETLIFY_BLOBS_LIMITS.FREE_TIER_STORAGE) * 100);
      const isNearLimit = usagePercentage >= (NETLIFY_BLOBS_LIMITS.WARNING_THRESHOLD * 100);
      const isCritical = usagePercentage >= (NETLIFY_BLOBS_LIMITS.CRITICAL_THRESHOLD * 100);

      console.log(`📊 Post-upload storage: ${usagePercentage}% (${(currentUsage / (1024 * 1024 * 1024)).toFixed(2)} GB)`);

      // Trigger automatic alert if thresholds are reached
      if (isNearLimit || isCritical) {
        console.log(`🚨 Storage threshold reached (${usagePercentage}%), triggering automatic admin alerts...`);

        // Call the storage quota alert function
        const alertUrl = `${process.env.NETLIFY_SITE_URL || 'http://localhost:3000'}/.netlify/functions/send-storage-quota-alert`;

        // Fire and forget - don't wait for email response to avoid blocking upload response
        fetch(alertUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }).then(response => {
          if (response.ok) {
            console.log('✅ Automatic storage alert triggered successfully');
          } else {
            console.error('❌ Failed to trigger automatic storage alert:', response.status);
          }
        }).catch(alertError => {
          console.error('❌ Error triggering automatic storage alert:', alertError);
        });
      } else {
        console.log(`✅ Storage usage (${usagePercentage}%) is within normal limits, no alerts needed`);
      }
    } catch (storageCheckError) {
      console.error('⚠️ Failed to check storage usage after upload (non-critical):', storageCheckError);
      // Don't fail the upload if storage check fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: uploadResult.message,
        fileId: uploadResult.fileId,
        metadata: uploadResult.metadata
      })
    };

  } catch (error) {
    console.error('❌ Medical certificate upload error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Dati non validi',
          message: error.issues[0]?.message || 'Errore di validazione',
          details: error.issues
        })
      };
    }

    // Handle authentication errors - provide detailed debug info
    if (error instanceof Error && error.message.includes('token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Non autorizzato',
          message: 'Token di autenticazione non valido o scaduto',
          debug: {
            errorMessage: error.message,
            errorName: error.constructor.name,
            hasAuthHeader: !!event.headers.authorization,
            hasCookieHeader: !!event.headers.cookie,
            authHeaderLength: event.headers.authorization?.length || 0,
            cookieLength: event.headers.cookie?.length || 0,
            environment: {
              nodeEnv: process.env.NODE_ENV,
              hasJwtSecret: !!process.env.JWT_SECRET,
              netlify: process.env.NETLIFY,
              context: process.env.CONTEXT
            },
            timestamp: new Date().toISOString()
          }
        })
      };
    }

    // Handle other known errors
    if (error instanceof Error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Errore di upload',
          message: error.message
        })
      };
    }

    // Handle unknown errors
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Errore interno',
        message: 'Errore imprevisto durante il caricamento del certificato medico'
      })
    };
  }
};