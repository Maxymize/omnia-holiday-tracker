// Mock blob storage for development
// In production, this would use real Netlify Blobs

import { promises as fs } from 'fs';
import { join } from 'path';

interface BlobMetadata {
  originalName: string;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
  holidayRequestId: string;
  iv: string;
  size: number;
}

interface StoredBlob {
  content: string;
  metadata: BlobMetadata;
}

// File-based storage for development (persists between function calls)
const STORAGE_DIR = join(process.cwd(), '.mock-blob-storage');

// Initialize storage directory
async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

// Helper functions for file-based storage
async function getStorageFilePath(storeName: string, key: string): Promise<string> {
  await ensureStorageDir();
  const storeDir = join(STORAGE_DIR, storeName);
  try {
    await fs.access(storeDir);
  } catch {
    await fs.mkdir(storeDir, { recursive: true });
  }
  return join(storeDir, `${key}.json`);
}

async function readBlobFile(filePath: string): Promise<StoredBlob | null> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function writeBlobFile(filePath: string, blob: StoredBlob): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(blob, null, 2));
}

async function deleteBlobFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // File doesn't exist, ignore
  }
}

async function listBlobFiles(storeName: string): Promise<string[]> {
  await ensureStorageDir();
  const storeDir = join(STORAGE_DIR, storeName);
  try {
    const files = await fs.readdir(storeDir);
    return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

export class MockBlobStore {
  private name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  async set(key: string, content: string, options: { metadata: BlobMetadata }): Promise<void> {
    const filePath = await getStorageFilePath(this.name, key);
    const blob: StoredBlob = {
      content,
      metadata: options.metadata
    };
    await writeBlobFile(filePath, blob);
  }
  
  async get(key: string, options?: { type: 'text' }): Promise<string | null> {
    const filePath = await getStorageFilePath(this.name, key);
    const blob = await readBlobFile(filePath);
    return blob ? blob.content : null;
  }
  
  async getMetadata(key: string): Promise<BlobMetadata | null> {
    const filePath = await getStorageFilePath(this.name, key);
    const blob = await readBlobFile(filePath);
    return blob ? blob.metadata : null;
  }
  
  async delete(key: string): Promise<void> {
    const filePath = await getStorageFilePath(this.name, key);
    await deleteBlobFile(filePath);
  }
  
  async list(): Promise<string[]> {
    return await listBlobFiles(this.name);
  }
}

// Factory function to get store (mimics Netlify Blobs API)
export function getStore(options: { name: string; siteID?: string }): MockBlobStore {
  return new MockBlobStore(options.name);
}

// Export all stored blobs for debugging
export async function getAllBlobs() {
  const stores = ['medical-certificates']; // Add other store names as needed
  const allBlobs = [];
  
  for (const storeName of stores) {
    const keys = await listBlobFiles(storeName);
    for (const key of keys) {
      const filePath = await getStorageFilePath(storeName, key);
      const blob = await readBlobFile(filePath);
      if (blob) {
        allBlobs.push({
          store: storeName,
          key,
          ...blob
        });
      }
    }
  }
  
  return allBlobs;
}

// Clear all blobs (for testing)
export async function clearAllBlobs() {
  try {
    await fs.rm(STORAGE_DIR, { recursive: true, force: true });
  } catch {
    // Directory doesn't exist, ignore
  }
}