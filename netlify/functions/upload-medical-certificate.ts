import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { encryptFile, generateFileId, isValidMedicalCertificateType, isValidFileSize } from '../../lib/utils/crypto';
import { updateHolidayRequestWithFileId } from '../../lib/mock-storage';

// Use mock storage in development, real Netlify Blobs in production
// Detect development mode by checking multiple indicators
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.NETLIFY_DEV === 'true' || 
                     !process.env.NETLIFY_SITE_ID;

const getStore = isDevelopment
  ? require('../../lib/mock-blob-storage').getStore
  : require('@netlify/blobs').getStore;

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

interface UploadRequest {
  fileName: string;
  fileType: string;
  fileContent: string; // Base64 encoded file content
  holidayRequestId: string;
}

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify authentication
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Parse request body
    const body: UploadRequest = JSON.parse(event.body || '{}');
    
    // Validate required fields
    if (!body.fileName || !body.fileType || !body.fileContent || !body.holidayRequestId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Check if this holiday request already has a medical certificate
    const existingRequests = require('../../lib/mock-storage').loadFromMockStorage('new-holiday-requests') || [];
    const holidayRequest = existingRequests.find((req: any) => req.id === body.holidayRequestId);
    
    if (!holidayRequest) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Holiday request not found' })
      };
    }

    // Check if user owns this holiday request
    if (holidayRequest.employeeId !== userToken.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'You can only upload certificates for your own requests' })
      };
    }

    // Check if a medical certificate already exists for this request
    if (holidayRequest.medicalCertificateFileId && holidayRequest.medicalCertificateStatus === 'uploaded') {
      return {
        statusCode: 409, // Conflict
        headers,
        body: JSON.stringify({ 
          error: 'Un certificato medico è già stato caricato per questa richiesta',
          existingFileId: holidayRequest.medicalCertificateFileId
        })
      };
    }

    // Validate file type
    if (!isValidMedicalCertificateType(body.fileType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid file type. Allowed types: PDF, JPEG, JPG, PNG, GIF, WEBP' 
        })
      };
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(body.fileContent, 'base64');
    
    // Validate file size
    if (!isValidFileSize(fileBuffer.length)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'File too large. Maximum size is 10MB' 
        })
      };
    }

    // Generate unique file ID
    const fileId = generateFileId(userToken.userId);
    
    // Encrypt the file
    const { encrypted, iv } = encryptFile(fileBuffer);
    
    // Get Netlify Blobs store
    const store = getStore({
      name: 'medical-certificates',
      siteID: process.env.NETLIFY_SITE_ID
    });
    
    // Store encrypted file with metadata
    await store.set(fileId, encrypted, {
      metadata: {
        originalName: body.fileName,
        mimeType: body.fileType,
        uploadedBy: userToken.email,
        uploadedAt: new Date().toISOString(),
        holidayRequestId: body.holidayRequestId,
        iv: iv, // Store IV for decryption
        size: fileBuffer.length
      }
    });

    // Log upload for audit trail (in production, this would go to a database)
    console.log('Medical certificate uploaded:', {
      fileId,
      uploadedBy: userToken.email,
      fileName: body.fileName,
      holidayRequestId: body.holidayRequestId,
      timestamp: new Date().toISOString()
    });

    // Update the holiday request with the file ID
    updateHolidayRequestWithFileId(body.holidayRequestId, fileId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        fileId,
        message: 'Medical certificate uploaded successfully'
      })
    };

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to upload medical certificate' })
    };
  }
};