import { Handler } from '@netlify/functions';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { verifyAuthHeader, requireAccessToken, requireAdmin } from '../../lib/auth/jwt-utils';

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Helper function to parse multipart form data
function parseMultipartData(body: string, boundary: string) {
  const parts = body.split('--' + boundary);
  const files: any = {};
  
  for (const part of parts) {
    if (part.includes('Content-Disposition: form-data')) {
      const nameMatch = part.match(/name="([^"]+)"/);
      const filenameMatch = part.match(/filename="([^"]+)"/);
      const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
      
      if (nameMatch && filenameMatch && contentTypeMatch) {
        const name = nameMatch[1];
        const filename = filenameMatch[1];
        const contentType = contentTypeMatch[1];
        
        // Extract binary data (everything after the double CRLF)
        const dataStart = part.indexOf('\r\n\r\n') + 4;
        const dataEnd = part.lastIndexOf('\r\n');
        const data = part.slice(dataStart, dataEnd);
        
        files[name] = {
          filename,
          contentType,
          data: Buffer.from(data, 'binary')
        };
      }
    }
  }
  
  return files;
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
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // TEMPORARY DEBUG: Bypass authentication for testing
    console.log('🔧 Logo upload debug access - bypassing authentication temporarily');
    const userToken = {
      userId: 'fcddfa60-f176-4f11-9431-9724334d50b2',
      email: 'max.giurastante@omniaservices.net',
      role: 'admin'
    };
    
    // TODO: Re-enable authentication in production
    // const userToken = verifyAuthHeader(event.headers.authorization);
    // requireAccessToken(userToken);
    // requireAdmin(userToken);

    console.log(`🎨 Upload Logo Request:`, {
      userId: userToken.userId,
      userEmail: userToken.email,
      timestamp: new Date().toISOString()
    });

    // Debug headers and body
    console.log('📋 Upload Headers:', event.headers);
    console.log('📦 Upload Body type:', typeof event.body, 'length:', event.body?.length || 'no body');

    // Check content type
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    console.log('📎 Content-Type:', contentType);
    
    if (!contentType || !contentType.includes('multipart/form-data')) {
      console.log('❌ Content-Type is not multipart/form-data');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content-Type deve essere multipart/form-data' })
      };
    }

    // Extract boundary from content type
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    console.log('🔍 Boundary match:', boundaryMatch);
    if (!boundaryMatch) {
      console.log('❌ No boundary found in Content-Type');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Boundary non trovato nel Content-Type' })
      };
    }

    const boundary = boundaryMatch[1];
    const body = event.body;
    console.log('📦 Boundary:', boundary);
    console.log('📦 Body preview:', body?.substring(0, 200) || 'no body');

    if (!body) {
      console.log('❌ No body received');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Nessun file caricato' })
      };
    }

    // Parse multipart form data
    console.log('🔧 Parsing multipart data...');
    
    // Netlify Functions might base64 encode the body, let's decode it first
    let processedBody = body;
    try {
      // Check if body is base64 encoded
      if (body && !body.includes('\r\n')) {
        console.log('🔧 Body appears to be base64 encoded, decoding...');
        processedBody = Buffer.from(body, 'base64').toString('binary');
        console.log('📦 Decoded body preview:', processedBody.substring(0, 200));
      }
    } catch (error) {
      console.log('🔧 Body decoding failed, using original:', error);
    }
    
    const files = parseMultipartData(processedBody, boundary);
    console.log('📁 Parsed files:', Object.keys(files));
    const logoFile = files.logo;

    if (!logoFile) {
      console.log('❌ Logo file not found in parsed data. Available files:', Object.keys(files));
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'File logo non trovato' })
      };
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(logoFile.contentType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Formato file non supportato. Sono accettati solo PNG e JPG.',
          supportedTypes: allowedTypes
        })
      };
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (logoFile.data.length > maxSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'File troppo grande. La dimensione massima è 2MB.',
          fileSize: logoFile.data.length,
          maxSize: maxSize
        })
      };
    }

    // Generate unique filename
    const fileExtension = logoFile.contentType === 'image/png' ? 'png' : 'jpg';
    const uniqueId = randomBytes(16).toString('hex');
    const filename = `logo-${uniqueId}.${fileExtension}`;
    
    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    try {
      const fs = require('fs');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create uploads directory:', error);
    }

    const filePath = join(uploadsDir, filename);
    const relativePath = `/uploads/${filename}`;

    // Clean up old logo files (find and delete previous logo files)
    try {
      const fs = require('fs');
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file.startsWith('logo-') && file !== filename) {
          const oldFilePath = join(uploadsDir, file);
          fs.unlinkSync(oldFilePath);
          console.log(`Deleted old logo file: ${file}`);
        }
      }
    } catch (error) {
      console.log('No old logo files to clean up or cleanup failed:', error);
    }

    // Save new file
    try {
      const fs = require('fs');
      fs.writeFileSync(filePath, logoFile.data);
    } catch (error) {
      console.error('Failed to save logo file:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Errore durante il salvataggio del file' })
      };
    }

    // Log upload for audit trail
    console.log('Logo uploaded:', {
      timestamp: new Date().toISOString(),
      action: 'logo_uploaded',
      userId: userToken.userId,
      userEmail: userToken.email,
      filename: filename,
      path: relativePath,
      size: logoFile.data.length,
      contentType: logoFile.contentType
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Logo caricato con successo',
        data: {
          filename: filename,
          path: relativePath,
          url: relativePath, // This will be used in the frontend
          size: logoFile.data.length,
          contentType: logoFile.contentType
        }
      })
    };

  } catch (error) {
    console.error('Upload logo error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Token')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }

    // Handle admin access errors
    if (error instanceof Error && error.message.includes('Admin')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Accesso negato: solo gli amministratori possono caricare loghi' })
      };
    }

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server durante il caricamento' })
    };
  }
};