import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';
import { updateHolidayRequestWithFileId } from '../../lib/db/operations';
// Use v2 version that works properly with Netlify Blobs in production
import { storeMedicalCertificate } from '../../lib/storage/medical-certificates-v2';
import { storeSimpleMedicalCertificate } from '../../lib/storage/medical-certificates-simple';

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

    // Store the certificate securely with encryption
    console.log('🔍 Attempting primary storage (Netlify Blobs)...');
    let storageResult;

    try {
      storageResult = await storeMedicalCertificate(
        fileBuffer,
        fileName,
        fileType,
        uploadedBy,
        holidayRequestId
      );

      if (!storageResult.success) {
        throw new Error(storageResult.message);
      }

      console.log('✅ Primary storage (Netlify Blobs) successful');

    } catch (primaryError) {
      console.log('❌ Primary storage failed, trying simple fallback storage...');
      console.error('Primary storage error:', primaryError);

      // Fallback to simple storage
      storageResult = await storeSimpleMedicalCertificate(
        fileBuffer,
        fileName,
        fileType,
        uploadedBy,
        holidayRequestId
      );

      if (!storageResult.success) {
        throw new Error(`Both storage methods failed. Primary: ${primaryError instanceof Error ? primaryError.message : 'Unknown'}. Fallback: ${storageResult.message}`);
      }

      console.log('✅ Fallback storage successful with file ID:', storageResult.fileId);
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