import CryptoJS from 'crypto-js';

// Generate a secure encryption key from environment variable
const getEncryptionKey = (): string => {
  const key = process.env.MEDICAL_CERT_ENCRYPTION_KEY || 'omnia-medical-cert-default-key-2024';
  // In production, this should be a secure random key stored in env variables
  return key;
};

/**
 * Encrypts a file buffer using AES-256 encryption
 */
export function encryptFile(fileBuffer: Buffer): {
  encrypted: string;
  iv: string;
} {
  const key = getEncryptionKey();
  
  // Convert buffer to base64 string for encryption
  const fileBase64 = fileBuffer.toString('base64');
  
  // Generate random IV (initialization vector)
  const iv = CryptoJS.lib.WordArray.random(16);
  
  // Encrypt the file
  const encrypted = CryptoJS.AES.encrypt(fileBase64, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return {
    encrypted: encrypted.toString(),
    iv: iv.toString()
  };
}

/**
 * Decrypts an encrypted file string back to buffer
 */
export function decryptFile(encryptedData: string, iv: string): Buffer {
  const key = getEncryptionKey();
  
  try {
    // Parse IV from hex string
    const ivWordArray = CryptoJS.enc.Hex.parse(iv);
    
    // Decrypt the file
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Check if decryption was successful
    if (decrypted.sigBytes <= 0) {
      throw new Error('Decryption failed: empty result');
    }
    
    // Convert decrypted data back to base64 string
    // The decrypted data should be the base64 string we encrypted originally
    const fileBase64 = decrypted.toString(CryptoJS.enc.Utf8);
    
    // Validate base64 format
    if (!fileBase64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(fileBase64)) {
      throw new Error('Decryption result is not valid base64');
    }
    
    // Convert base64 to buffer
    return Buffer.from(fileBase64, 'base64');
    
  } catch (error) {
    console.error('File decryption failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      encryptedDataLength: encryptedData.length,
      ivLength: iv.length
    });
    
    throw new Error(`Failed to decrypt file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a secure unique ID for file storage
 */
export function generateFileId(employeeId: string, timestamp: number = Date.now()): string {
  const hash = CryptoJS.SHA256(`${employeeId}-${timestamp}-${Math.random()}`);
  return hash.toString(CryptoJS.enc.Hex).substring(0, 32);
}

/**
 * Validates file type for medical certificates
 */
export function isValidMedicalCertificateType(mimeType: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Validates file size (max 10MB)
 */
export function isValidFileSize(sizeInBytes: number): boolean {
  const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
  return sizeInBytes <= maxSizeInBytes;
}