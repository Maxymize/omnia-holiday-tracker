import { createHash } from 'crypto';

// Simple medical certificate storage using base64 in database
// This bypasses Netlify Blobs completely and stores encrypted certificates directly

interface SimpleCertificateData {
  fileId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  encryptedData: string; // Base64 encoded encrypted file
  uploadedBy: string;
  uploadedAt: string;
  holidayRequestId: string;
}

// Simple XOR encryption (for demo - in production use proper encryption)
function simpleEncrypt(data: Buffer, key: string): string {
  const keyBuffer = Buffer.from(key.repeat(Math.ceil(data.length / key.length)).slice(0, data.length));
  const encrypted = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keyBuffer[i];
  }

  return encrypted.toString('base64');
}

function simpleDecrypt(encryptedBase64: string, key: string): Buffer {
  const encrypted = Buffer.from(encryptedBase64, 'base64');
  const keyBuffer = Buffer.from(key.repeat(Math.ceil(encrypted.length / key.length)).slice(0, encrypted.length));
  const decrypted = Buffer.alloc(encrypted.length);

  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBuffer[i];
  }

  return decrypted;
}

// Generate a simple file ID
function generateSimpleFileId(uploadedBy: string): string {
  const timestamp = Date.now().toString();
  const hash = createHash('md5').update(uploadedBy + timestamp).digest('hex').slice(0, 8);
  return `med_${hash}_${timestamp}`;
}

// Store certificate using simple approach
export async function storeSimpleMedicalCertificate(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  uploadedBy: string,
  holidayRequestId: string
): Promise<{ fileId: string; success: boolean; message: string }> {
  try {
    console.log('🏥 Simple storage: Starting certificate storage...');

    // Validate file size (max 5MB for simple storage)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileBuffer.length > maxSize) {
      throw new Error('File size exceeds 5MB limit for temporary storage');
    }

    // Generate file ID
    const fileId = generateSimpleFileId(uploadedBy);

    // Encrypt the file data
    const encryptionKey = process.env.MEDICAL_CERT_ENCRYPTION_KEY || 'default-key-12345';
    const encryptedData = simpleEncrypt(fileBuffer, encryptionKey);

    // Create certificate data object
    const certificateData: SimpleCertificateData = {
      fileId,
      fileName: originalName,
      fileType: mimeType,
      fileSize: fileBuffer.length,
      encryptedData,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      holidayRequestId
    };

    // For now, we'll store this in memory (in production, store in database)
    // This is a temporary solution until Netlify Blobs is working
    console.log('🏥 Simple storage: Certificate encrypted and prepared');
    console.log('🏥 Simple storage: File ID:', fileId);

    // Store in temporary memory (for testing)
    storeInMemory(fileId, certificateData);

    return {
      fileId,
      success: true,
      message: 'Certificate stored using temporary simple storage method (in-memory)'
    };

  } catch (error) {
    console.error('❌ Simple storage error:', error);
    return {
      fileId: '',
      success: false,
      message: error instanceof Error ? error.message : 'Unknown storage error'
    };
  }
}

// In-memory storage for testing (temporary solution)
const temporaryStorage = new Map<string, SimpleCertificateData>();

// Store certificate data temporarily
export function storeInMemory(fileId: string, data: SimpleCertificateData) {
  temporaryStorage.set(fileId, data);
  console.log('🏥 Stored in temporary memory:', fileId);
}

// Retrieve certificate using simple approach
export async function getSimpleMedicalCertificate(
  fileId: string
): Promise<{ success: boolean; fileBuffer?: Buffer; fileName?: string; mimeType?: string; message: string }> {
  try {
    console.log('🏥 Simple storage: Retrieving certificate:', fileId);

    // Check temporary in-memory storage
    const certificateData = temporaryStorage.get(fileId);

    if (!certificateData) {
      return {
        success: false,
        message: `Certificate with ID ${fileId} not found in temporary storage. Note: Simple storage is temporary and certificates may expire.`
      };
    }

    // Decrypt the file data
    const encryptionKey = process.env.MEDICAL_CERT_ENCRYPTION_KEY || 'default-key-12345';
    const decryptedBuffer = simpleDecrypt(certificateData.encryptedData, encryptionKey);

    console.log('🏥 Simple storage: Certificate decrypted successfully');

    return {
      success: true,
      fileBuffer: decryptedBuffer,
      fileName: certificateData.fileName,
      mimeType: certificateData.fileType,
      message: 'Certificate retrieved from temporary storage'
    };

  } catch (error) {
    console.error('❌ Simple storage retrieval error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown retrieval error'
    };
  }
}