import { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import { retrieveMedicalCertificateWithBlobs } from '../../lib/storage/medical-certificates-blobs-manual';
import { retrieveMedicalCertificateFromDB } from '../../lib/storage/medical-certificates-db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Check authorization
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'Non autorizzato',
          message: 'Token di autenticazione mancante'
        })
      };
    }

    const token = authHeader.substring(7);
    const userToken = jwt.verify(token, JWT_SECRET) as any;

    // Only admins can get certificate info
    if (userToken.role !== 'admin') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Accesso negato',
          message: 'Solo gli amministratori possono accedere alle informazioni dei certificati medici'
        })
      };
    }

    // Get file ID from query parameters
    const fileId = event.queryStringParameters?.fileId;
    if (!fileId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Parametro mancante',
          message: 'ID del certificato medico richiesto'
        })
      };
    }

    console.log('📄 Getting medical certificate info:', {
      fileId,
      requestedBy: userToken.email
    });

    // Try Netlify Blobs first
    let metadata: any = null;

    try {
      const blobResult = await retrieveMedicalCertificateWithBlobs(fileId, userToken.email);
      if (blobResult.success && blobResult.metadata) {
        metadata = {
          originalName: blobResult.metadata.originalName,
          mimeType: blobResult.metadata.mimeType,
          uploadedBy: blobResult.metadata.uploadedBy,
          uploadedAt: blobResult.metadata.uploadedAt,
          size: blobResult.metadata.size,
          storageType: 'netlify-blobs'
        };
      }
    } catch (blobError) {
      console.log('⚠️ Netlify Blobs retrieval failed, trying database:', blobError);
    }

    // Fallback to database if Blobs failed
    if (!metadata) {
      const dbResult = await retrieveMedicalCertificateFromDB(fileId, userToken.email);
      if (dbResult.success) {
        metadata = {
          originalName: dbResult.fileName || 'medical_certificate.pdf',
          mimeType: dbResult.mimeType || 'application/pdf',
          uploadedBy: userToken.email, // Use requester's email as fallback
          uploadedAt: new Date().toISOString(), // Use current date as fallback
          size: dbResult.fileBuffer?.length || 0,
          storageType: 'database'
        };
      }
    }

    if (!metadata) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Non trovato',
          message: 'Certificato medico non trovato'
        })
      };
    }

    // Determine file extension from MIME type or original name
    let fileExtension = 'pdf';
    if (metadata.originalName) {
      const ext = metadata.originalName.split('.').pop()?.toLowerCase();
      if (ext && ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        fileExtension = ext;
      }
    } else if (metadata.mimeType) {
      const mimeToExt: Record<string, string> = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp'
      };
      fileExtension = mimeToExt[metadata.mimeType] || 'pdf';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        fileId,
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        fileExtension,
        uploadedBy: metadata.uploadedBy,
        uploadedAt: metadata.uploadedAt,
        size: metadata.size,
        storageType: metadata.storageType
      })
    };

  } catch (error) {
    console.error('❌ Error getting medical certificate info:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Errore interno',
        message: 'Errore nel recupero delle informazioni del certificato medico'
      })
    };
  }
};