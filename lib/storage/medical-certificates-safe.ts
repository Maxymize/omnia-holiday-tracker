// Safe version that doesn't use Netlify Blobs to avoid production errors
// This is a temporary solution until Netlify Blobs is properly configured

import { encryptFile, decryptFile, generateFileId, isValidMedicalCertificateType, isValidFileSize } from '../utils/crypto';

// Storage configuration
const RETENTION_DAYS = parseInt(process.env.MEDICAL_CERT_RETENTION_DAYS || '2555'); // ~7 years default

// Medical certificate metadata interface
interface MedicalCertificateMetadata {
  originalName: string;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  expiresAt: string;
  holidayRequestId: string;
}

// In-memory storage (temporary solution)
const memoryStorage = new Map<string, { data: string; metadata: MedicalCertificateMetadata }>();

// Store medical certificate (memory-only for now)
export async function storeMedicalCertificate(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  uploadedBy: string,
  holidayRequestId: string
): Promise<{ success: boolean; fileId?: string; message: string; error?: string }> {
  try {
    console.log('🏥 Starting medical certificate storage (safe mode - memory only)...');

    // Validate file type and size
    if (!isValidMedicalCertificateType(mimeType)) {
      return {
        success: false,
        message: 'Tipo di file non supportato. Sono accettati solo PDF, JPG, PNG e HEIC.'
      };
    }

    if (!isValidFileSize(fileBuffer.length)) {
      return {
        success: false,
        message: 'File troppo grande. Il limite massimo è 10MB.'
      };
    }

    // Generate unique file ID
    const fileId = generateFileId(uploadedBy);
    console.log('📋 Generated file ID:', fileId);

    // Encrypt the file
    const encryptionResult = encryptFile(fileBuffer);
    console.log('🔐 File encrypted successfully');

    // Prepare metadata
    const metadata: MedicalCertificateMetadata = {
      originalName,
      mimeType,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      holidayRequestId
    };

    // Store in memory with encrypted data and IV
    const dataToStore = {
      encrypted: encryptionResult.encrypted,
      iv: encryptionResult.iv
    };

    memoryStorage.set(fileId, {
      data: JSON.stringify(dataToStore),
      metadata
    });

    console.log('✅ Medical certificate stored in memory (temporary):', {
      fileId,
      originalName,
      size: fileBuffer.length,
      encrypted: true,
      storage: 'memory-temporary'
    });

    return {
      success: true,
      fileId,
      message: 'Certificato medico salvato temporaneamente (il file verrà perso al riavvio del server)'
    };

  } catch (error) {
    console.error('❌ Error storing medical certificate:', error);
    return {
      success: false,
      message: 'Errore durante il salvataggio del certificato medico',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Retrieve medical certificate from memory
export async function retrieveMedicalCertificate(
  fileId: string,
  userEmail: string
): Promise<{ success: boolean; fileBuffer?: Buffer; metadata?: MedicalCertificateMetadata; error?: string }> {
  try {
    console.log('🔍 Retrieving medical certificate from memory:', fileId);

    // Retrieve from memory
    const stored = memoryStorage.get(fileId);

    if (!stored) {
      console.log('❌ Certificate not found in memory:', fileId);
      return {
        success: false,
        error: 'Certificato non trovato (potrebbe essere stato perso al riavvio del server)'
      };
    }

    // Parse the stored data
    const storedData = JSON.parse(stored.data);

    // Decrypt the file
    const decryptedBuffer = decryptFile(storedData.encrypted, storedData.iv);
    console.log('🔓 File decrypted successfully');

    console.log('✅ Medical certificate retrieved from memory:', {
      fileId,
      originalName: stored.metadata?.originalName,
      size: decryptedBuffer.length,
      requestedBy: userEmail
    });

    return {
      success: true,
      fileBuffer: decryptedBuffer,
      metadata: stored.metadata
    };

  } catch (error) {
    console.error('❌ Error retrieving medical certificate:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Delete medical certificate from memory
export async function deleteMedicalCertificate(fileId: string): Promise<boolean> {
  try {
    console.log('🗑️ Deleting medical certificate from memory:', fileId);

    // Delete from memory
    const deleted = memoryStorage.delete(fileId);

    if (deleted) {
      console.log('✅ Medical certificate deleted from memory:', fileId);
    } else {
      console.log('⚠️ Medical certificate not found in memory:', fileId);
    }

    return deleted;

  } catch (error) {
    console.error('❌ Error deleting medical certificate:', error);
    return false;
  }
}

// List all medical certificates (for admin purposes)
export async function listMedicalCertificates(): Promise<Array<{ key: string; metadata: any }>> {
  try {
    console.log('📋 Listing all medical certificates from memory...');

    const certificates: Array<{ key: string; metadata: any }> = [];

    memoryStorage.forEach((value, key) => {
      certificates.push({
        key,
        metadata: value.metadata
      });
    });

    console.log(`✅ Found ${certificates.length} medical certificates in memory`);
    return certificates;

  } catch (error) {
    console.error('❌ Error listing medical certificates:', error);
    return [];
  }
}