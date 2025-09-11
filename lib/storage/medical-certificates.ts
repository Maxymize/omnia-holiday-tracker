import { getStore } from '@netlify/blobs';
import { encryptFile, decryptFile, generateFileId, isValidMedicalCertificateType, isValidFileSize } from '../utils/crypto';

// Storage configuration
const RETENTION_DAYS = parseInt(process.env.MEDICAL_CERT_RETENTION_DAYS || '2555'); // ~7 years default

// Get Netlify Blobs store for medical certificates
const getBlobs = () => {
  try {
    return getStore('medical-certificates');
  } catch (error) {
    console.error('Failed to initialize Netlify Blobs store:', error);
    throw new Error('Storage initialization failed');
  }
};

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
 * Stores a medical certificate securely with AES-256 encryption
 */
export async function storeMedicalCertificate(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  uploadedBy: string,
  holidayRequestId: string
): Promise<{ fileId: string; success: boolean; message: string }> {
  try {
    // Validate file type
    if (!isValidMedicalCertificateType(mimeType)) {
      throw new Error(`Invalid file type: ${mimeType}. Allowed types: PDF, JPG, PNG, GIF, WebP`);
    }

    // Validate file size
    if (!isValidFileSize(fileBuffer.length)) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Initialize Netlify Blobs store
    const blobs = getBlobs();

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

    // Save to Netlify Blobs
    await blobs.set(fileId, JSON.stringify(storedCertificate));

    console.log('✅ Medical certificate stored securely:', {
      fileId,
      originalName,
      size: fileBuffer.length,
      uploadedBy,
      expiresAt: metadata.expiresAt
    });

    return {
      fileId,
      success: true,
      message: 'Medical certificate stored securely'
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
    // Initialize Netlify Blobs store
    const blobs = getBlobs();

    // Read stored certificate from Netlify Blobs
    const fileContent = await blobs.get(fileId, { type: 'text' });
    
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
        await blobs.delete(fileId);
        return {
          success: false,
          error: 'Medical certificate has expired and been removed'
        };
      }
    }

    // Decrypt the file
    const decryptedBuffer = decryptFile(storedCertificate.content, storedCertificate.metadata.iv);

    console.log('✅ Medical certificate retrieved successfully:', {
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
    // Initialize Netlify Blobs store
    const blobs = getBlobs();

    // Check if file exists
    const fileContent = await blobs.get(fileId, { type: 'text' });
    if (!fileContent) {
      return {
        success: false,
        message: 'Medical certificate not found'
      };
    }

    // Delete from Netlify Blobs
    await blobs.delete(fileId);

    console.log('✅ Medical certificate deleted:', {
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
    // Initialize Netlify Blobs store
    const blobs = getBlobs();

    // List all blobs in the medical-certificates store
    const blobsList = await blobs.list();

    const certificates = [];
    
    for (const blobInfo of blobsList.blobs) {
      try {
        const fileId = blobInfo.key;
        const content = await blobs.get(fileId, { type: 'text' });
        
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