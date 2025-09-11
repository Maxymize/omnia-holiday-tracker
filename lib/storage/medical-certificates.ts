import fs from 'fs/promises';
import path from 'path';
import { encryptFile, decryptFile, generateFileId, isValidMedicalCertificateType, isValidFileSize } from '../utils/crypto';

// Storage configuration
const STORAGE_DIR = path.join(process.cwd(), '.mock-blob-storage', 'medical-certificates');
const RETENTION_DAYS = parseInt(process.env.MEDICAL_CERT_RETENTION_DAYS || '2555'); // ~7 years default

// Ensure storage directory exists
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create storage directory:', error);
    throw new Error('Storage initialization failed');
  }
}

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
    console.log('📥 Starting medical certificate storage:', {
      originalName,
      mimeType,
      uploadedBy,
      holidayRequestId,
      fileSize: fileBuffer.length,
      storageDir: STORAGE_DIR,
      retentionDays: RETENTION_DAYS
    });

    // Validate file type
    if (!isValidMedicalCertificateType(mimeType)) {
      console.error('❌ Invalid file type:', mimeType);
      throw new Error(`Invalid file type: ${mimeType}. Allowed types: PDF, JPG, PNG, GIF, WebP`);
    }
    console.log('✅ File type validation passed');

    // Validate file size
    if (!isValidFileSize(fileBuffer.length)) {
      console.error('❌ File size too large:', fileBuffer.length);
      throw new Error('File size exceeds 10MB limit');
    }
    console.log('✅ File size validation passed');

    // Ensure storage directory exists
    console.log('📁 Creating storage directory:', STORAGE_DIR);
    await ensureStorageDir();
    console.log('✅ Storage directory ready');

    // Generate secure file ID
    console.log('🔑 Generating file ID...');
    const fileId = generateFileId(uploadedBy);
    console.log('✅ File ID generated:', fileId);

    // Encrypt the file
    console.log('🔐 Starting encryption...');
    const { encrypted, iv } = encryptFile(fileBuffer);
    console.log('✅ Encryption completed, IV:', iv);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + RETENTION_DAYS);
    console.log('📅 Expiration date set:', expiresAt.toISOString());

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

    // Save to file system
    const filePath = path.join(STORAGE_DIR, `${fileId}.json`);
    await fs.writeFile(filePath, JSON.stringify(storedCertificate, null, 2));

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
    // Ensure storage directory exists
    await ensureStorageDir();

    const filePath = path.join(STORAGE_DIR, `${fileId}.json`);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return {
        success: false,
        error: 'Medical certificate not found'
      };
    }

    // Read stored certificate
    const fileContent = await fs.readFile(filePath, 'utf8');
    const storedCertificate: StoredCertificate = JSON.parse(fileContent);

    // Check if certificate has expired
    if (storedCertificate.metadata.expiresAt) {
      const expirationDate = new Date(storedCertificate.metadata.expiresAt);
      if (new Date() > expirationDate) {
        // Certificate expired - delete it
        await fs.unlink(filePath);
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
    const filePath = path.join(STORAGE_DIR, `${fileId}.json`);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return {
        success: false,
        message: 'Medical certificate not found'
      };
    }

    // Delete the file
    await fs.unlink(filePath);

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
    await ensureStorageDir();

    const files = await fs.readdir(STORAGE_DIR);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    const certificates = [];
    
    for (const file of jsonFiles) {
      try {
        const fileId = file.replace('.json', '');
        const filePath = path.join(STORAGE_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        const storedCertificate: StoredCertificate = JSON.parse(content);
        
        certificates.push({
          fileId,
          metadata: storedCertificate.metadata
        });
      } catch (error) {
        console.warn('Skipping corrupted certificate file:', file, error);
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