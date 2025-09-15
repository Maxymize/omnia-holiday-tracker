import { Handler } from '@netlify/functions';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';
// Try Netlify Blobs with manual config, fallback to database if needed
import { retrieveMedicalCertificateWithBlobs } from '../../lib/storage/medical-certificates-blobs-manual';
import { retrieveMedicalCertificateFromDB } from '../../lib/storage/medical-certificates-db';

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Metodo non consentito',
        message: 'Solo richieste GET sono supportate' 
      })
    };
  }

  try {
    // Verify authentication
    const userToken = await verifyAuthFromRequest(event);
    requireAccessToken(userToken);
    
    console.log('📥 Processing medical certificate download request for user:', userToken.userId);

    // Get fileId from query parameters
    const fileId = event.queryStringParameters?.fileId;
    
    if (!fileId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Parametro mancante',
          message: 'ID del file richiesto'
        })
      };
    }

    console.log('📋 Download request for fileId:', fileId);

    // Try Netlify Blobs first, then database
    console.log('🔍 Attempting retrieval from Netlify Blobs...');
    let retrievalResult: any;

    try {
      retrievalResult = await retrieveMedicalCertificateWithBlobs(fileId, userToken.email);

      if (!retrievalResult.success) {
        throw new Error(retrievalResult.error || 'Blobs retrieval failed');
      }

      console.log('✅ Netlify Blobs retrieval successful');
    } catch (blobError) {
      console.error('❌ Netlify Blobs failed, trying database:', blobError);

      // Fallback to database
      retrievalResult = await retrieveMedicalCertificateFromDB(fileId, userToken.email);

      if (!retrievalResult.success) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'Certificato non trovato',
            message: `Not found in Blobs or DB. Blobs: ${blobError instanceof Error ? blobError.message : 'Unknown'}. DB: ${retrievalResult.error || 'Not found'}`
          })
        };
      }

      console.log('✅ Database retrieval successful (fallback)');
    }

    if (!retrievalResult.fileBuffer) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Errore di decrittazione',
          message: 'Impossibile decrittare il certificato medico'
        })
      };
    }

    // Get file metadata from either source
    const originalName = retrievalResult.metadata?.originalName || retrievalResult.fileName || 'medical_certificate.pdf';
    const mimeType = retrievalResult.metadata?.mimeType || retrievalResult.mimeType || 'application/octet-stream';

    console.log('✅ Certificate decrypted successfully:', {
      fileId,
      originalName: originalName,
      mimeType: mimeType,
      size: retrievalResult.fileBuffer.length,
      requestedBy: userToken.email,
      storageType: retrievalResult.metadata ? 'netlify-blobs' : 'database'
    });

    // Set appropriate content type header based on actual MIME type
    const contentType = mimeType;

    // Generate safe filename for download, preserving the original extension
    const fileExtension = originalName.split('.').pop() || 'pdf';
    const baseFileName = originalName.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const safeFileName = `${baseFileName}.${fileExtension}`;

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
        'Content-Length': retrievalResult.fileBuffer.length.toString(),
      },
      body: retrievalResult.fileBuffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('❌ Medical certificate download error:', error);

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
          error: 'Errore di download',
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
        message: 'Errore imprevisto durante il download del certificato medico'
      })
    };
  }
};