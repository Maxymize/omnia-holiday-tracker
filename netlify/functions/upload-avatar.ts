import { Handler } from '@netlify/functions';
import { z } from 'zod';
import { verifyAuthHeader, requireAccessToken } from '../../lib/auth/jwt-utils';

// Validation schemas
const uploadAvatarSchema = z.object({
  imageData: z.string().min(1, 'Dati immagine richiesti'),
  fileName: z.string().min(1, 'Nome file richiesto'),
  mimeType: z.string().regex(/^image\/(jpeg|jpg|png|gif|webp)$/i, 'Tipo di file non supportato')
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Convert base64 to buffer and validate image
async function processImageUpload(imageData: string, mimeType: string, fileName: string) {
  try {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64Data = imageData.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Validate file size (limit to 2MB)
    const maxSizeInBytes = 2 * 1024 * 1024; // 2MB
    if (imageBuffer.length > maxSizeInBytes) {
      throw new Error('File troppo grande. Dimensione massima: 2MB');
    }

    // Validate minimum size (at least 1KB)
    if (imageBuffer.length < 1024) {
      throw new Error('File troppo piccolo. Dimensione minima: 1KB');
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = mimeType.split('/')[1];
    const uniqueFileName = `avatar_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

    // For now, we'll convert the image to a data URL (since we don't have cloud storage)
    // In a production environment, you would upload to AWS S3, Cloudinary, etc.
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return {
      success: true,
      avatarUrl: dataUrl,
      fileName: uniqueFileName,
      fileSize: imageBuffer.length,
      mimeType
    };

  } catch (error) {
    console.error('Image processing error:', error);
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
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Verify authentication
    const userToken = verifyAuthHeader(event.headers.authorization);
    requireAccessToken(userToken);

    // Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const validatedData = uploadAvatarSchema.parse(body);

    // Process image upload
    const uploadResult = await processImageUpload(
      validatedData.imageData,
      validatedData.mimeType,
      validatedData.fileName
    );

    // Log upload activity
    console.log(`Avatar uploaded by user: ${userToken.email} at ${new Date().toISOString()}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Avatar caricato con successo',
        data: {
          avatarUrl: uploadResult.avatarUrl,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType
        }
      })
    };

  } catch (error) {
    console.error('Avatar upload error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Dati non validi',
          details: error.issues?.map(e => e.message) || [error.message]
        })
      };
    }

    // Handle business logic errors
    if (error instanceof Error) {
      if (error.message.includes('troppo grande') || 
          error.message.includes('troppo piccolo') ||
          error.message.includes('non supportato')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: error.message })
        };
      }
    }

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore durante il caricamento dell\'avatar' })
    };
  }
};