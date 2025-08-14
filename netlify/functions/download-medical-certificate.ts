import { Handler } from '@netlify/functions';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';
import { decryptFile } from '../../lib/utils/crypto';
import { loadFromMockStorage } from '../../lib/mock-storage';

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
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers, 
      body: '' 
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify authentication
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Get file ID from query parameters
    const fileId = event.queryStringParameters?.fileId;
    
    if (!fileId) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'File ID is required' })
      };
    }

    // Get Netlify Blobs store
    const store = getStore({
      name: 'medical-certificates',
      siteID: process.env.NETLIFY_SITE_ID
    });
    
    // Retrieve encrypted file and metadata
    console.log('Looking for fileId:', fileId);
    console.log('Store name:', 'medical-certificates');
    
    const blob = await store.get(fileId, { type: 'text' });
    
    console.log('Blob found:', blob ? 'yes' : 'no');
    
    if (!blob) {
      // In development, also list all available keys for debugging
      if (isDevelopment) {
        try {
          const allKeys = await store.list();
          console.log('Available keys in store:', allKeys);
        } catch (e) {
          console.log('Error listing keys:', e);
        }
      }
      
      return {
        statusCode: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Medical certificate not found' })
      };
    }

    // Get metadata
    const metadata = await store.getMetadata(fileId);
    
    if (!metadata || !metadata.iv) {
      return {
        statusCode: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid file metadata' })
      };
    }

    // Authorization check: Admin can download any file, employees can only download their own
    if (userToken.role !== 'admin') {
      // For employees, check if the file belongs to their holiday request
      const holidayRequestId = metadata.holidayRequestId as string;
      if (!holidayRequestId) {
        return {
          statusCode: 403,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Access denied - file owner information not found' })
        };
      }

      // Check if the holiday request belongs to this user
      const mockHolidays = loadFromMockStorage('new-holiday-requests') || [];
      const holidayRequest = mockHolidays.find((h: any) => h.id === holidayRequestId);
      
      if (!holidayRequest || holidayRequest.employeeId !== userToken.userId) {
        console.log(`Access denied for user ${userToken.email} to file ${fileId}:`, {
          holidayRequestId,
          requestOwner: holidayRequest?.employeeId,
          currentUser: userToken.userId,
          holidayFound: !!holidayRequest
        });
        return {
          statusCode: 403,
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Access denied - you can only download your own medical certificates' })
        };
      }
    }

    // Decrypt the file
    const decryptedBuffer = decryptFile(blob, metadata.iv as string);
    
    // Log access for audit trail (in production, this would go to a database)
    console.log('Medical certificate accessed:', {
      fileId,
      accessedBy: userToken.email,
      fileName: metadata.originalName,
      holidayRequestId: metadata.holidayRequestId,
      timestamp: new Date().toISOString()
    });

    // Return the decrypted file
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': metadata.mimeType as string || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${metadata.originalName}"`,
        'Content-Length': decryptedBuffer.length.toString()
      },
      body: decryptedBuffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Download error:', error);
    
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }

    if (error instanceof Error && error.message.includes('Access')) {
      return {
        statusCode: 403,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Access denied' })
      };
    }

    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to download medical certificate' })
    };
  }
};