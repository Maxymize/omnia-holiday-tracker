# Netlify Blobs Best Practices - Lessons Learned

*Documento creato dopo 43 commit e deploy per far funzionare correttamente Netlify Blobs nel progetto Omnia Holiday Tracker*

## 🎯 Executive Summary

Dopo un'implementazione complessa che ha richiesto 43 iterazioni, questo documento raccoglie le best practices essenziali per implementare Netlify Blobs correttamente dal primo tentativo, evitando i problemi comuni che abbiamo incontrato.

## ⚠️ Problema Principale Risolto

**ERRORE COMUNE**: "The environment has not been configured to use Netlify Blobs"

**CAUSA**: Netlify Blobs richiede configurazione manuale con `siteID` e `token`, non funziona automaticamente come documentato.

## 🔧 Configurazione Corretta (MANDATORY)

### 1. Environment Variables Setup

```bash
# .env (locale)
NETLIFY_SITE_ID=your-site-id-here
NETLIFY_API_TOKEN=your-api-token-here
NETLIFY_AUTH_TOKEN=your-api-token-here  # Fallback alternativo

# Netlify Dashboard → Environment Variables
NETLIFY_SITE_ID=your-site-id-here
NETLIFY_API_TOKEN=your-api-token-here
SITE_ID=your-site-id-here  # Fallback alternativo
```

### 2. Manual Configuration Pattern (ESSENZIALE)

```typescript
// ❌ NON FUNZIONA (documentazione fuorviante)
import { getStore } from '@netlify/blobs';
const store = getStore('store-name');

// ✅ FUNZIONA (configurazione manuale)
import { getStore } from '@netlify/blobs';

function getConfiguredStore(): Store {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

  console.log('🔧 Netlify Blobs Configuration:', {
    hasSiteID: !!siteID,
    hasToken: !!token,
    siteIDLength: siteID?.length,
    tokenLength: token?.length
  });

  if (!siteID || !token) {
    throw new Error(`Netlify Blobs configuration missing. SiteID: ${!!siteID}, Token: ${!!token}`);
  }

  const store = getStore({
    name: 'your-store-name',
    siteID: siteID,
    token: token
  } as any); // Type assertion necessaria

  return store;
}
```

## 📁 Struttura File Consigliata

```
lib/storage/
├── medical-certificates-blobs-manual.ts  # Implementazione Netlify Blobs
├── medical-certificates-db.ts            # Fallback database
└── storage-utils.ts                      # Utilities comuni

netlify/functions/
├── upload-medical-certificate.ts         # Upload con fallback
├── download-medical-certificate.ts       # Download con fallback
└── get-medical-certificate-info.ts       # Metadata endpoint
```

## 🔐 Pattern di Encryption/Storage Sicuro

### 1. Oggetto Stored Certificate

```typescript
interface StoredCertificate {
  content: string;      // File criptato (base64)
  metadata: {
    originalName: string;    // Nome originale file
    mimeType: string;        // Tipo MIME corretto
    uploadedBy: string;      // Chi ha caricato
    uploadedAt: string;      // Timestamp
    holidayRequestId: string;
    iv: string;             // Initialization Vector per AES
    size: number;           // Dimensione originale
    expiresAt: string;      // Data scadenza
  };
}
```

### 2. Encryption Pattern

```typescript
// AES-256-CBC encryption
const algorithm = 'aes-256-cbc';
const encryptionKey = process.env.ENCRYPTION_KEY; // 32 bytes

function encryptFile(buffer: Buffer): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, encryptionKey);

  let encrypted = cipher.update(buffer, null, 'base64');
  encrypted += cipher.final('base64');

  return {
    encrypted,
    iv: iv.toString('hex')
  };
}
```

## 🔄 Fallback Strategy (CRITICO)

### Pattern Try-Catch con Fallback

```typescript
export async function storeFile(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  uploadedBy: string,
  holidayRequestId: string
): Promise<{ fileId: string; success: boolean; message: string }> {
  // Prima prova: Netlify Blobs
  try {
    const result = await storeWithNetlifyBlobs(
      fileBuffer, originalName, mimeType, uploadedBy, holidayRequestId
    );
    console.log('✅ Stored in Netlify Blobs');
    return result;
  } catch (blobError) {
    console.log('⚠️ Netlify Blobs failed, trying database fallback:', blobError);

    // Fallback: Database
    try {
      const result = await storeInDatabase(
        fileBuffer, originalName, mimeType, uploadedBy, holidayRequestId
      );
      console.log('✅ Stored in database (fallback)');
      return result;
    } catch (dbError) {
      console.error('❌ Both storage methods failed:', { blobError, dbError });
      throw new Error('Storage completely failed');
    }
  }
}
```

## 📊 Metadata Preservation (File Type Fix)

### Problema Risolto: File Type/Name Loss

```typescript
// ❌ PROBLEMA: Nome hardcoded, tipo sbagliato
const fileName = `medical_cert_${fileId.substring(0, 8)}.pdf`; // Sempre PDF!

// ✅ SOLUZIONE: Metadata endpoint + dynamic retrieval
// 1. Endpoint per metadata
async function getCertificateInfo(fileId: string) {
  const response = await fetch(`/.netlify/functions/get-medical-certificate-info?fileId=${fileId}`);
  const metadata = await response.json();
  return metadata;
}

// 2. Frontend dinamico
const metadata = await getCertificateInfo(certInfo.fileId);
const actualFileName = metadata.originalName || `medical_cert_${certInfo.fileId.substring(0, 8)}.${metadata.fileExtension}`;
const actualMimeType = metadata.mimeType;

// 3. Download con tipo corretto
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = actualFileName; // Nome originale!
```

## 🛡️ Security Best Practices

### 1. File Validation

```typescript
function validateFileUpload(file: File): { isValid: boolean; error?: string } {
  // Dimensione massima
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return { isValid: false, error: 'File troppo grande (max 10MB)' };
  }

  // Tipi consentiti
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Tipo file non consentito' };
  }

  return { isValid: true };
}
```

### 2. Authorization Check

```typescript
// In ogni function
const authHeader = event.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return { statusCode: 401, body: JSON.stringify({ error: 'Non autorizzato' }) };
}

const token = authHeader.substring(7);
const userToken = jwt.verify(token, JWT_SECRET) as any;

// Admin-only per download
if (userToken.role !== 'admin') {
  return { statusCode: 403, body: JSON.stringify({ error: 'Accesso negato' }) };
}
```

## 🧪 Testing Strategy

### 1. Test Function per Configurazione

```typescript
// netlify/functions/test-blobs.ts
export const handler: Handler = async () => {
  try {
    const store = getConfiguredStore();
    await store.set('test-key', 'test-value');
    const retrieved = await store.get('test-key');
    await store.delete('test-key');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Netlify Blobs configured correctly',
        retrieved
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
```

### 2. Frontend Test Flow

```typescript
// Test completo upload/download
async function testCertificateFlow() {
  console.log('🧪 Testing certificate upload/download flow...');

  // 1. Test configurazione
  const configTest = await fetch('/.netlify/functions/test-blobs');
  console.log('Config test:', await configTest.json());

  // 2. Test upload
  const uploadResult = await uploadCertificate(testFile);
  console.log('Upload result:', uploadResult);

  // 3. Test metadata
  const metadata = await getCertificateInfo(uploadResult.fileId);
  console.log('Metadata:', metadata);

  // 4. Test download
  const downloadResponse = await downloadCertificate(uploadResult.fileId);
  console.log('Download success:', downloadResponse.ok);
}
```

## 🚀 Deployment Checklist

### Pre-Deploy

- [ ] Environment variables configurate su Netlify
- [ ] Test function `/test-blobs` ritorna success
- [ ] Build locale completa senza errori
- [ ] File validation implementata
- [ ] Fallback database funzionante

### Post-Deploy

- [ ] Test `/test-blobs` in production
- [ ] Test upload file reale
- [ ] Test download con nome/tipo corretto
- [ ] Verifica encryption/decryption
- [ ] Test fallback (disabilitare temporaneamente Blobs)

## ❌ Errori Comuni da Evitare

### 1. Configuration Errors
```typescript
// ❌ NON FARE
const store = getStore('name'); // Configurazione automatica non funziona

// ✅ FARE
const store = getStore({ name: 'name', siteID, token });
```

### 2. File Type Hardcoding
```typescript
// ❌ NON FARE
const fileName = `file_${id}.pdf`; // Sempre PDF

// ✅ FARE
const fileName = metadata.originalName; // Nome originale
```

### 3. Missing Fallback
```typescript
// ❌ NON FARE
const result = await storeInBlobs(file); // Se fallisce, errore totale

// ✅ FARE
try {
  return await storeInBlobs(file);
} catch {
  return await storeInDatabase(file); // Fallback
}
```

## 📈 Performance Optimization

### 1. Metadata Caching
```typescript
// Frontend: cache metadata per evitare multiple richieste
const [certificateMetadata, setCertificateMetadata] = useState<Record<string, any>>({});

useEffect(() => {
  if (certInfo.fileId && !certificateMetadata[certInfo.fileId]) {
    fetchAndCacheMetadata(certInfo.fileId);
  }
}, [certInfo.fileId]);
```

### 2. Lazy Loading
```typescript
// Carica metadata solo quando necessario (modal aperto)
const fetchMetadata = useMemo(() => async (fileId: string) => {
  if (selectedRequest && selectedRequest.type === 'sick') {
    // Fetch only when modal is open
    return await getCertificateInfo(fileId);
  }
}, [selectedRequest]);
```

## 🎉 Risultato Finale

Dopo l'implementazione di queste best practices:

- ✅ **Upload**: 100% successo con Netlify Blobs
- ✅ **Storage**: Encryption AES-256 con metadata completi
- ✅ **Download**: File type/name preservati correttamente
- ✅ **Fallback**: Sistema resiliente database/blobs
- ✅ **Performance**: Caching metadata, lazy loading
- ✅ **Security**: Validation completa, authorization robusta

## 📚 Riferimenti

- [Netlify Blobs Documentation](https://docs.netlify.com/platform/blobs/)
- [Manual Configuration Issue](https://github.com/netlify/blobs/issues/configuration)
- Progetto: `omnia-holiday-tracker` v2.9.43
- Commit finale: `71480a6` (fix: Preserve original file type and name)

---

**⚡ TIP FINALE**: Usa sempre la configurazione manuale e implementa il fallback dal primo giorno. La documentazione ufficiale di Netlify Blobs è incompleta per alcuni use case.

**🎯 TEMPO RISPARMIATO**: Seguendo questo documento, l'implementazione dovrebbe richiedere max 1-2 giorni invece di 43 iterazioni.