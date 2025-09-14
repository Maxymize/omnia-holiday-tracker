import { getStore } from '@netlify/blobs';
import type { Store } from '@netlify/blobs';
import { encryptFile, decryptFile, generateFileId, isValidMedicalCertificateType, isValidFileSize } from '../utils/crypto';

// Storage configuration
const RETENTION_DAYS = parseInt(process.env.MEDICAL_CERT_RETENTION_DAYS || '2555'); // ~7 years default

// Medical certificate metadata interface
interface MedicalCertificateMetadata {
  originalName: string;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  holidayRequestId: string;
  iv: string;
  size: number;
  expiresAt?: string;
}

// Stored certificate structure
interface StoredCertificate {
  content: string; // Encrypted content
  metadata: MedicalCertificateMetadata;
}

/**
 * Get the Netlify Blobs store instance
 * In Netlify Functions, this automatically uses the correct siteID and token
 */
function getMedicalCertificateStore(): Store {
  return getStore('medical-certificates');
}

/**
 * Stores a medical certificate securely with AES-256 encryption
 */
export async function storeMedicalCertificate(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  uploadedBy: string,
  holidayRequestId: string
): Promise<{ fileId: string; success: boolean; message: string }> {
  console.log('🚀 storeMedicalCertificate called with:', {
    originalName,
    mimeType,
    uploadedBy,
    holidayRequestId,
    bufferLength: fileBuffer.length
  });

  try {
    // Validate file type
    if (!isValidMedicalCertificateType(mimeType)) {
      throw new Error(`Invalid file type: ${mimeType}. Allowed types: PDF, JPG, PNG, GIF, WebP`);
    }

    // Validate file size
    if (!isValidFileSize(fileBuffer.length)) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Get the store
    const store = getMedicalCertificateStore();

    // Generate secure file ID
    const fileId = generateFileId(uploadedBy);

    // Encrypt the file
    const { encrypted, iv } = encryptFile(fileBuffer);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + RETENTION_DAYS);

    // Create metadata
    const metadata: MedicalCertificateMetadata = {
      originalName,
      mimeType,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      holidayRequestId,
      iv,
      size: fileBuffer.length,
      expiresAt: expiresAt.toISOString()
    };

    // Create stored certificate object
    const storedCertificate: StoredCertificate = {
      content: encrypted,
      metadata
    };

    // Store in Netlify Blobs
    await store.set(fileId, JSON.stringify(storedCertificate));

    console.log('✅ Medical certificate stored in Netlify Blobs:', {
      fileId,
      originalName,
      size: fileBuffer.length,
      uploadedBy,
      expiresAt: metadata.expiresAt
    });

    return {
      fileId,
      success: true,
      message: 'Medical certificate stored securely in Netlify Blobs'
    };

  } catch (error) {
    console.error('❌ Failed to store medical certificate:', error);
    return {
      fileId: '',
      success: false,
      message: error instanceof Error ? error.message : 'Unknown storage error'
    };
  }
}

/**
 * Retrieves and decrypts a medical certificate
 */
export async function retrieveMedicalCertificate(
  fileId: string,
  requestedBy: string
): Promise<{
  success: boolean;
  fileBuffer?: Buffer;
  metadata?: MedicalCertificateMetadata;
  error?: string;
}> {
  try {
    // Get the store
    const store = getMedicalCertificateStore();

    // Get the certificate from Netlify Blobs
    const fileContent = await store.get(fileId, { type: 'text' });

    if (!fileContent) {
      return {
        success: false,
        error: 'Medical certificate not found'
      };
    }

    const storedCertificate: StoredCertificate = JSON.parse(fileContent);

    // Check if certificate has expired
    if (storedCertificate.metadata.expiresAt) {
      const expirationDate = new Date(storedCertificate.metadata.expiresAt);
      if (new Date() > expirationDate) {
        // Certificate expired - delete it from Netlify Blobs
        await store.delete(fileId);
        return {
          success: false,
          error: 'Medical certificate has expired and been removed'
        };
      }
    }

    // Decrypt the file
    const decryptedBuffer = decryptFile(storedCertificate.content, storedCertificate.metadata.iv);

    console.log('✅ Medical certificate retrieved from Netlify Blobs:', {
      fileId,
      originalName: storedCertificate.metadata.originalName,
      requestedBy,
      size: decryptedBuffer.length
    });

    return {
      success: true,
      fileBuffer: decryptedBuffer,
      metadata: storedCertificate.metadata
    };

  } catch (error) {
    console.error('❌ Failed to retrieve medical certificate:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown retrieval error'
    };
  }
}

/**
 * Deletes a medical certificate (for compliance/cleanup)
 */
export async function deleteMedicalCertificate(
  fileId: string,
  deletedBy: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get the store
    const store = getMedicalCertificateStore();

    // Check if file exists
    const fileContent = await store.get(fileId, { type: 'text' });
    if (!fileContent) {
      return {
        success: false,
        message: 'Medical certificate not found'
      };
    }

    // Delete from Netlify Blobs
    await store.delete(fileId);

    console.log('✅ Medical certificate deleted from Netlify Blobs:', {
      fileId,
      deletedBy,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Medical certificate deleted successfully'
    };

  } catch (error) {
    console.error('❌ Failed to delete medical certificate:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown deletion error'
    };
  }
}

/**
 * Lists all medical certificates for administrative purposes
 */
export async function listMedicalCertificates(): Promise<{
  success: boolean;
  certificates: Array<{ fileId: string; metadata: MedicalCertificateMetadata }>;
  error?: string;
}> {
  try {
    // Get the store
    const store = getMedicalCertificateStore();
    const certificates = [];

    // List all blobs
    const { blobs } = await store.list();

    for (const blobInfo of blobs) {
      try {
        const fileId = blobInfo.key;
        const content = await store.get(fileId, { type: 'text' });

        if (content) {
          const storedCertificate: StoredCertificate = JSON.parse(content);

          certificates.push({
            fileId,
            metadata: storedCertificate.metadata
          });
        }
      } catch (error) {
        console.warn('Skipping corrupted certificate blob:', blobInfo.key, error);
      }
    }

    return {
      success: true,
      certificates
    };

  } catch (error) {
    console.error('❌ Failed to list medical certificates:', error);
    return {
      success: false,
      certificates: [],
      error: error instanceof Error ? error.message : 'Unknown listing error'
    };
  }
}

/**
 * Cleanup expired certificates (for scheduled maintenance)
 */
export async function cleanupExpiredCertificates(): Promise<{
  success: boolean;
  deletedCount: number;
  message: string;
}> {
  try {
    const { success, certificates } = await listMedicalCertificates();

    if (!success) {
      throw new Error('Failed to list certificates for cleanup');
    }

    let deletedCount = 0;
    const now = new Date();

    for (const cert of certificates) {
      if (cert.metadata.expiresAt && new Date(cert.metadata.expiresAt) < now) {
        const deleteResult = await deleteMedicalCertificate(cert.fileId, 'system-cleanup');
        if (deleteResult.success) {
          deletedCount++;
        }
      }
    }

    return {
      success: true,
      deletedCount,
      message: `Cleanup completed: ${deletedCount} expired certificates deleted`
    };

  } catch (error) {
    console.error('❌ Failed to cleanup expired certificates:', error);
    return {
      success: false,
      deletedCount: 0,
      message: error instanceof Error ? error.message : 'Unknown cleanup error'
    };
  }
}