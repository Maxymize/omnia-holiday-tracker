import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';

// Validation schemas
const uploadCertificateSchema = z.object({
  fileName: z.string().min(1, 'Nome file richiesto'),
  fileType: z.string().min(1, 'Tipo di file richiesto'),
  holidayRequestId: z.string().uuid('ID richiesta ferie non valido'),
  contentLength: z.number().min(1, 'Dimensione file richiesta'),
  fileData: z.string().optional() // Base64 data opzionale
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Process file upload
async function processCertificateUpload(fileName: string, fileType: string, holidayRequestId: string, contentLength: number) {
  try {
    // Validate file type (PDF, DOC, DOCX, JPG, PNG)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg', 
      'image/png'
    ];

    if (!allowedTypes.includes(fileType)) {
      throw new Error('Tipo di file non supportato. Supportati: PDF, DOC, DOCX, JPG, PNG');
    }

    // Validate file size (limit to 5MB)
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (contentLength > maxSizeInBytes) {
      throw new Error('File troppo grande. Dimensione massima: 5MB');
    }

    // Validate minimum size (at least 1KB)
    if (contentLength < 1024) {
      throw new Error('File troppo piccolo. Dimensione minima: 1KB');
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop() || 'pdf';
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
    const uniqueFileName = `medical_cert_${holidayRequestId}_${timestamp}_${sanitizedFileName}`;

    // For now, we'll store file metadata (in production, upload to cloud storage)
    // This is a placeholder - in real implementation you would:
    // 1. Upload to AWS S3, Cloudinary, or similar
    // 2. Store file URL in database linked to holiday request
    // 3. Set up proper encryption for sensitive medical documents
    
    const fileMetadata = {
      originalFileName: fileName,
      uniqueFileName,
      fileType,
      fileSize: contentLength,
      holidayRequestId,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded'
    };

    return {
      success: true,
      fileId: uniqueFileName,
      message: 'Certificato medico caricato con successo',
      metadata: fileMetadata
    };

  } catch (error) {
    console.error('Certificate upload error:', error);
    throw error;
  }
}

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Metodo non consentito',
        message: 'Solo richieste POST sono supportate' 
      })
    };
  }

  try {
    // Verify authentication
    const userToken = await verifyAuthFromRequest(event);
    requireAccessToken(userToken);
    
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
      validatedData.contentLength
    );

    console.log('✅ Certificate upload successful:', uploadResult.fileId);

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
          message: error.errors[0]?.message || 'Errore di validazione',
          details: error.errors
        })
      };
    }

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Non autorizzato',
          message: 'Token di autenticazione non valido o scaduto'
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