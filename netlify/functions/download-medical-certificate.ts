import { Handler } from '@netlify/functions';
import { verifyAuthFromRequest, requireAccessToken } from '../../lib/auth/jwt-utils';
import { retrieveMedicalCertificate } from '../../lib/storage/medical-certificates';

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

    // Retrieve and decrypt the medical certificate
    const retrievalResult = await retrieveMedicalCertificate(fileId, userToken.email);

    if (!retrievalResult.success) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Certificato non trovato',
          message: retrievalResult.error || 'Il certificato medico richiesto non è disponibile'
        })
      };
    }

    if (!retrievalResult.fileBuffer || !retrievalResult.metadata) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Errore di decrittazione',
          message: 'Impossibile decrittare il certificato medico'
        })
      };
    }

    console.log('✅ Certificate decrypted successfully:', {
      fileId,
      originalName: retrievalResult.metadata.originalName,
      size: retrievalResult.fileBuffer.length,
      requestedBy: userToken.email
    });

    // Determine file extension from original name or mime type
    const originalName = retrievalResult.metadata.originalName;
    const mimeType = retrievalResult.metadata.mimeType;
    
    // Set appropriate content type header
    const contentType = mimeType || 'application/octet-stream';
    
    // Generate safe filename for download
    const safeFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');

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