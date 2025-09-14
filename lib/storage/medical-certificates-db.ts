/**
 * Database-based storage for medical certificates
 * Stores encrypted certificates directly in PostgreSQL
 * More reliable than in-memory or Netlify Blobs
 */

import { db } from '../db/index';
import { medicalCertificates } from '../db/schema';
import { eq } from 'drizzle-orm';
import { encryptFile, decryptFile, generateFileId, isValidMedicalCertificateType, isValidFileSize } from '../utils/crypto';

// Storage configuration
const RETENTION_DAYS = parseInt(process.env.MEDICAL_CERT_RETENTION_DAYS || '2555'); // ~7 years default

/**
 * Stores a medical certificate in the database with AES-256 encryption
 */
export async function storeMedicalCertificateInDB(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  uploadedBy: string,
  holidayRequestId: string,
  uploadedById: string
): Promise<{ fileId: string; success: boolean; message: string }> {
  console.log('🗄️ Storing medical certificate in database:', {
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

    // Generate secure file ID
    const fileId = generateFileId(uploadedBy);

    // Encrypt the file
    const { encrypted, iv } = encryptFile(fileBuffer);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + RETENTION_DAYS);

    // Store in database
    await db.insert(medicalCertificates).values({
      fileId,
      holidayRequestId,
      originalFileName: originalName,
      mimeType,
      fileSize: fileBuffer.length,
      encryptedData: encrypted, // Base64 encrypted content
      encryptionMethod: 'AES-256',
      uploadedBy: uploadedById,
      uploadedAt: new Date(),
      expiresAt,
      downloadCount: 0
    });

    console.log('✅ Medical certificate stored in database:', {
      fileId,
      originalName,
      size: fileBuffer.length,
      uploadedBy,
      expiresAt
    });

    return {
      fileId,
      success: true,
      message: 'Medical certificate stored securely in database'
    };

  } catch (error) {
    console.error('❌ Failed to store medical certificate in database:', error);
    return {
      fileId: '',
      success: false,
      message: error instanceof Error ? error.message : 'Unknown storage error'
    };
  }
}

/**
 * Retrieves and decrypts a medical certificate from the database
 */
export async function retrieveMedicalCertificateFromDB(
  fileId: string,
  requestedBy: string
): Promise<{
  success: boolean;
  fileBuffer?: Buffer;
  fileName?: string;
  mimeType?: string;
  message?: string;
  error?: string;
}> {
  console.log('🗄️ Retrieving medical certificate from database:', {
    fileId,
    requestedBy
  });

  try {
    // Get certificate from database
    const certificates = await db
      .select()
      .from(medicalCertificates)
      .where(eq(medicalCertificates.fileId, fileId))
      .limit(1);

    if (!certificates || certificates.length === 0) {
      return {
        success: false,
        error: 'Medical certificate not found'
      };
    }

    const certificate = certificates[0];

    // Check if certificate has expired
    if (certificate.expiresAt && new Date() > certificate.expiresAt) {
      // Certificate expired - delete it
      await db
        .delete(medicalCertificates)
        .where(eq(medicalCertificates.fileId, fileId));

      return {
        success: false,
        error: 'Medical certificate has expired and been removed'
      };
    }

    // Extract IV from the encrypted data
    // The crypto utils store IV at the beginning of the encrypted string
    const ivLength = 32; // 16 bytes as hex = 32 chars
    const iv = certificate.encryptedData.substring(0, ivLength);
    const encryptedContent = certificate.encryptedData.substring(ivLength);

    // Decrypt the file
    const decryptedBuffer = decryptFile(encryptedContent, iv);

    // Update download count
    await db
      .update(medicalCertificates)
      .set({
        downloadCount: certificate.downloadCount + 1,
        lastDownloadAt: new Date()
      })
      .where(eq(medicalCertificates.fileId, fileId));

    console.log('✅ Medical certificate retrieved from database:', {
      fileId,
      originalName: certificate.originalFileName,
      requestedBy,
      size: decryptedBuffer.length
    });

    return {
      success: true,
      fileBuffer: decryptedBuffer,
      fileName: certificate.originalFileName,
      mimeType: certificate.mimeType,
      message: 'Certificate retrieved successfully'
    };

  } catch (error) {
    console.error('❌ Failed to retrieve medical certificate from database:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown retrieval error'
    };
  }
}

/**
 * Deletes a medical certificate from the database
 */
export async function deleteMedicalCertificateFromDB(
  fileId: string,
  deletedBy: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if certificate exists
    const certificates = await db
      .select()
      .from(medicalCertificates)
      .where(eq(medicalCertificates.fileId, fileId))
      .limit(1);

    if (!certificates || certificates.length === 0) {
      return {
        success: false,
        message: 'Medical certificate not found'
      };
    }

    // Delete from database
    await db
      .delete(medicalCertificates)
      .where(eq(medicalCertificates.fileId, fileId));

    console.log('✅ Medical certificate deleted from database:', {
      fileId,
      deletedBy,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Medical certificate deleted successfully'
    };

  } catch (error) {
    console.error('❌ Failed to delete medical certificate from database:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown deletion error'
    };
  }
}

/**
 * Lists all medical certificates from the database
 */
export async function listMedicalCertificatesFromDB(): Promise<{
  success: boolean;
  certificates: Array<{
    fileId: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    uploadedAt: Date;
    holidayRequestId: string;
  }>;
  error?: string;
}> {
  try {
    const certificates = await db
      .select({
        fileId: medicalCertificates.fileId,
        originalFileName: medicalCertificates.originalFileName,
        mimeType: medicalCertificates.mimeType,
        fileSize: medicalCertificates.fileSize,
        uploadedAt: medicalCertificates.uploadedAt,
        holidayRequestId: medicalCertificates.holidayRequestId
      })
      .from(medicalCertificates);

    return {
      success: true,
      certificates
    };

  } catch (error) {
    console.error('❌ Failed to list medical certificates from database:', error);
    return {
      success: false,
      certificates: [],
      error: error instanceof Error ? error.message : 'Unknown listing error'
    };
  }
}

/**
 * Cleanup expired certificates from the database
 */
export async function cleanupExpiredCertificatesFromDB(): Promise<{
  success: boolean;
  deletedCount: number;
  message: string;
}> {
  try {
    const now = new Date();

    // Get expired certificates
    const expiredCerts = await db
      .select({ fileId: medicalCertificates.fileId })
      .from(medicalCertificates)
      .where(eq(medicalCertificates.expiresAt, now));

    // Delete expired certificates
    if (expiredCerts.length > 0) {
      for (const cert of expiredCerts) {
        await db
          .delete(medicalCertificates)
          .where(eq(medicalCertificates.fileId, cert.fileId));
      }
    }

    return {
      success: true,
      deletedCount: expiredCerts.length,
      message: `Cleanup completed: ${expiredCerts.length} expired certificates deleted`
    };

  } catch (error) {
    console.error('❌ Failed to cleanup expired certificates from database:', error);
    return {
      success: false,
      deletedCount: 0,
      message: error instanceof Error ? error.message : 'Unknown cleanup error'
    };
  }
}