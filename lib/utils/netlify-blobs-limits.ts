/**
 * Netlify Blobs Storage Limits and Utilities
 *
 * Based on research:
 * - Max file size: 5 GB per object
 * - Free tier storage: ~100 GB total (tentative)
 * - Additional storage: ~$0.09 per GB/month
 */

// Costanti per i limiti di Netlify Blobs
export const NETLIFY_BLOBS_LIMITS = {
  // Limite pratico per upload via Netlify Functions: 4MB
  // (considerando base64 encoding ~33% overhead + buffer)
  MAX_FILE_SIZE: 4 * 1024 * 1024, // 4 MB in bytes (limite pratico Functions)

  // Limite teorico Netlify Blobs: 5 GB (non utilizzabile via Functions)
  THEORETICAL_MAX_FILE_SIZE: 5 * 1024 * 1024 * 1024, // 5 GB in bytes

  // Quota gratuita stimata: 100 GB
  FREE_TIER_STORAGE: 100 * 1024 * 1024 * 1024, // 100 GB in bytes

  // Soglia di avviso (80% del limite)
  WARNING_THRESHOLD: 0.8,

  // Soglia critica (95% del limite)
  CRITICAL_THRESHOLD: 0.95,

  // Formati supportati per certificati medici
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
};

// Utility per formattare dimensioni file in formato leggibile
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Utility per calcolare la percentuale di utilizzo dello storage
export function calculateStorageUsagePercentage(currentUsage: number): number {
  return Math.round((currentUsage / NETLIFY_BLOBS_LIMITS.FREE_TIER_STORAGE) * 100);
}

// Validazione per upload di file singolo
export function validateFileUpload(file: File, currentStorageUsed: number): {
  isValid: boolean;
  errorType?: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'STORAGE_FULL';
  fileSize?: number;
  maxSize?: number;
  warningType?: 'NEAR_LIMIT' | 'CRITICAL_LIMIT';
  usagePercentage?: number;
} {
  // Controlla dimensione singolo file
  if (file.size > NETLIFY_BLOBS_LIMITS.MAX_FILE_SIZE) {
    return {
      isValid: false,
      errorType: 'FILE_TOO_LARGE',
      fileSize: file.size,
      maxSize: NETLIFY_BLOBS_LIMITS.MAX_FILE_SIZE
    };
  }

  // Controlla tipo file
  if (!NETLIFY_BLOBS_LIMITS.ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      errorType: 'INVALID_TYPE'
    };
  }

  // Controlla se si supererebbe il limite totale
  if (currentStorageUsed + file.size > NETLIFY_BLOBS_LIMITS.FREE_TIER_STORAGE) {
    return {
      isValid: false,
      errorType: 'STORAGE_FULL'
    };
  }

  // Avviso se si avvicina al limite critico
  const newUsagePercentage = ((currentStorageUsed + file.size) / NETLIFY_BLOBS_LIMITS.FREE_TIER_STORAGE);

  if (newUsagePercentage > NETLIFY_BLOBS_LIMITS.CRITICAL_THRESHOLD) {
    return {
      isValid: true,
      warningType: 'CRITICAL_LIMIT',
      usagePercentage: Math.round(newUsagePercentage * 100)
    };
  }

  if (newUsagePercentage > NETLIFY_BLOBS_LIMITS.WARNING_THRESHOLD) {
    return {
      isValid: true,
      warningType: 'NEAR_LIMIT',
      usagePercentage: Math.round(newUsagePercentage * 100)
    };
  }

  return { isValid: true };
}

// Controlla se il storage è pieno (oltre il limite)
export function isStorageFull(currentStorageUsed: number): boolean {
  return currentStorageUsed >= NETLIFY_BLOBS_LIMITS.FREE_TIER_STORAGE;
}

// Controlla se il storage è in soglia di avviso
export function isStorageInWarningZone(currentStorageUsed: number): boolean {
  const usagePercentage = currentStorageUsed / NETLIFY_BLOBS_LIMITS.FREE_TIER_STORAGE;
  return usagePercentage >= NETLIFY_BLOBS_LIMITS.WARNING_THRESHOLD;
}

// Controlla se il storage è in soglia critica
export function isStorageInCriticalZone(currentStorageUsed: number): boolean {
  const usagePercentage = currentStorageUsed / NETLIFY_BLOBS_LIMITS.FREE_TIER_STORAGE;
  return usagePercentage >= NETLIFY_BLOBS_LIMITS.CRITICAL_THRESHOLD;
}

// Calcola quanto spazio rimanente
export function getRemainingStorage(currentStorageUsed: number): number {
  return Math.max(0, NETLIFY_BLOBS_LIMITS.FREE_TIER_STORAGE - currentStorageUsed);
}

// Stima quanti file di dimensione media possono ancora essere caricati
export function estimateRemainingUploads(currentStorageUsed: number, averageFileSize: number = 2 * 1024 * 1024): number {
  const remainingSpace = getRemainingStorage(currentStorageUsed);
  return Math.floor(remainingSpace / averageFileSize);
}