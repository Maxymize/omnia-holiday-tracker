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

// Initialize Netlify Blobs with proper configuration
const initializeNetlifyBlobs = async () => {
  console.log('🔍 Initializing Netlify Blobs with manual configuration...');

  // Debug environment
  console.log('🔍 Environment variables check:', {
    SITE_ID: process.env.SITE_ID,
    NETLIFY_SITE_ID: process.env.NETLIFY_SITE_ID,
    DEPLOY_ID: process.env.DEPLOY_ID,
    CONTEXT: process.env.CONTEXT,
    URL: process.env.URL,
    NETLIFY_API_TOKEN: process.env.NETLIFY_API_TOKEN ? 'Present' : 'Missing',
    NETLIFY_BLOBS_CONTEXT: process.env.NETLIFY_BLOBS_CONTEXT ? 'Present' : 'Missing'
  });

  try {
    const { getStore } = await import('@netlify/blobs');

    // Get the site ID from various possible sources
    const siteID = process.env.SITE_ID ||
                   process.env.NETLIFY_SITE_ID ||
                   '03cf5a24-7f96-44d0-ba24-77bb67ad31e1'; // Your actual site ID from Netlify dashboard

    // Get the API token (you need to add this to Netlify environment variables)
    const token = process.env.NETLIFY_API_TOKEN;

    if (!siteID) {
      throw new Error('Missing SITE_ID or NETLIFY_SITE_ID environment variable');
    }

    let store;

    // Try automatic configuration first (works if NETLIFY_BLOBS_CONTEXT is present)
    try {
      console.log('🔍 Attempting automatic Netlify Blobs configuration...');
      store = getStore('medical-certificates');
      console.log('✅ Automatic configuration successful!');
    } catch (autoError) {
      console.log('⚠️ Automatic configuration failed, trying manual configuration...');

      if (!token) {
        console.error('❌ Missing NETLIFY_API_TOKEN for manual configuration');
        console.log('📝 To fix this:');
        console.log('1. Go to Netlify dashboard → User settings → Applications → Personal access tokens');
        console.log('2. Create a new token with appropriate permissions');
        console.log('3. Add it as NETLIFY_API_TOKEN in Netlify environment variables with Functions scope');
        throw new Error('Missing NETLIFY_API_TOKEN for manual Netlify Blobs configuration');
      }

      // Manual configuration with siteID and token
      store = getStore({
        name: 'medical-certificates',
        siteID: siteID,
        token: token
      });

      console.log('✅ Manual configuration successful with siteID:', siteID);
    }

    // Test the store connection
    try {
      // Try a simple operation to verify the store works
      await store.list({ prefix: 'test-', limit: 1 });
      console.log('✅ Netlify Blobs store verified and working!');
    } catch (testError) {
      console.warn('⚠️ Could not verify store connection, but will proceed:', testError);
    }

    return store;
  } catch (error) {
    console.error('❌ Netlify Blobs initialization failed:', error);
    throw error;
  }
};

// Store medical certificate with Netlify Blobs
export async function storeMedicalCertificate(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  uploadedBy: string,
  holidayRequestId: string
): Promise<{ success: boolean; fileId?: string; message: string; error?: string }> {
  try {
    console.log('🏥 Starting medical certificate storage...');

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

    // Initialize Netlify Blobs
    const store = await initializeNetlifyBlobs();

    // Generate unique file ID
    const fileId = generateFileId();
    console.log('📋 Generated file ID:', fileId);

    // Encrypt the file
    const encryptedBuffer = await encryptFile(fileBuffer);
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

    // Store in Netlify Blobs
    await store.set(fileId, encryptedBuffer, {
      metadata: metadata as any
    });

    console.log('✅ Medical certificate stored successfully in Netlify Blobs:', {
      fileId,
      originalName,
      size: fileBuffer.length,
      encrypted: true,
      storage: 'netlify-blobs'
    });

    return {
      success: true,
      fileId,
      message: 'Certificato medico salvato con successo'
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

// Retrieve medical certificate from Netlify Blobs
export async function retrieveMedicalCertificate(
  fileId: string,
  userEmail: string
): Promise<{ success: boolean; fileBuffer?: Buffer; metadata?: MedicalCertificateMetadata; error?: string }> {
  try {
    console.log('🔍 Retrieving medical certificate:', fileId);

    // Initialize Netlify Blobs
    const store = await initializeNetlifyBlobs();

    // Retrieve from Netlify Blobs
    const result = await store.getWithMetadata(fileId);

    if (!result || !result.data) {
      console.log('❌ Certificate not found:', fileId);
      return {
        success: false,
        error: 'Certificato non trovato'
      };
    }

    // Convert blob to buffer
    const encryptedBuffer = Buffer.from(await result.data.arrayBuffer());

    // Decrypt the file
    const decryptedBuffer = await decryptFile(encryptedBuffer);
    console.log('🔓 File decrypted successfully');

    // Update download tracking (optional)
    const metadata = result.metadata as MedicalCertificateMetadata;
    console.log('✅ Medical certificate retrieved:', {
      fileId,
      originalName: metadata?.originalName,
      size: decryptedBuffer.length,
      requestedBy: userEmail
    });

    return {
      success: true,
      fileBuffer: decryptedBuffer,
      metadata
    };

  } catch (error) {
    console.error('❌ Error retrieving medical certificate:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Delete medical certificate from Netlify Blobs
export async function deleteMedicalCertificate(fileId: string): Promise<boolean> {
  try {
    console.log('🗑️ Deleting medical certificate:', fileId);

    // Initialize Netlify Blobs
    const store = await initializeNetlifyBlobs();

    // Delete from Netlify Blobs
    await store.delete(fileId);

    console.log('✅ Medical certificate deleted:', fileId);
    return true;

  } catch (error) {
    console.error('❌ Error deleting medical certificate:', error);
    return false;
  }
}

// List all medical certificates (for admin purposes)
export async function listMedicalCertificates(): Promise<Array<{ key: string; metadata: any }>> {
  try {
    console.log('📋 Listing all medical certificates...');

    // Initialize Netlify Blobs
    const store = await initializeNetlifyBlobs();

    // List all items
    const list = await store.list();

    const certificates = [];
    for await (const item of list) {
      certificates.push({
        key: item.key,
        metadata: item.metadata
      });
    }

    console.log(`✅ Found ${certificates.length} medical certificates`);
    return certificates;

  } catch (error) {
    console.error('❌ Error listing medical certificates:', error);
    return [];
  }
}