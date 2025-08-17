import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Support multiple database URL environment variables
// Prefer NETLIFY_DATABASE_URL_UNPOOLED for better compatibility with Neon client
let databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL, NETLIFY_DATABASE_URL_UNPOOLED, or NETLIFY_DATABASE_URL environment variable is required');
}

console.log('🔧 Original database URL format check:', {
  startsWithPostgres: databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'),
  hasAt: databaseUrl.includes('@'),
  hasSlash: databaseUrl.includes('/'),
  length: databaseUrl.length
});

// Clean up the connection string for Neon client compatibility
// Handle both postgres:// and postgresql:// protocols
if (databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
  console.log('🔧 Converting postgres:// to postgresql://');
  databaseUrl = databaseUrl.replace('postgres://', 'postgresql://');
}

// Remove channel_binding parameter if present (not supported by @neondatabase/serverless)
if (databaseUrl.includes('channel_binding')) {
  console.log('🔧 Removing channel_binding parameter from connection string');
  
  try {
    // Try URL parsing approach first
    const url = new URL(databaseUrl);
    url.searchParams.delete('channel_binding');
    
    // Ensure sslmode is set
    if (!url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require');
    }
    
    databaseUrl = url.toString();
    console.log('🔧 Successfully cleaned URL using URL API');
    
  } catch (urlError) {
    console.log('⚠️ URL API parsing failed, using fallback string replacement');
    // Fallback to string replacement if URL parsing fails
    databaseUrl = databaseUrl
      .replace(/[?&]channel_binding=require/g, '')
      .replace(/&&/g, '&')
      .replace(/[?]&/g, '?');
    
    // Ensure sslmode is present
    if (!databaseUrl.includes('sslmode=')) {
      databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'sslmode=require';
    }
  }
}

// Final validation
try {
  // Try to parse as URL to validate format
  const testUrl = new URL(databaseUrl);
  console.log('✅ Database URL validation passed:', {
    protocol: testUrl.protocol,
    hostname: testUrl.hostname,
    pathname: testUrl.pathname,
    hasAuth: testUrl.username !== '',
    sslmode: testUrl.searchParams.get('sslmode')
  });
} catch (validationError) {
  console.error('❌ Database URL validation failed:', validationError);
  console.error('Invalid URL (masked):', databaseUrl.replace(/:\/\/[^@]+@/, '://***:***@'));
  
  // Last resort: try to fix common issues
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error('Database URL must start with postgresql:// or postgres://');
  }
  
  // If we get here, log the error but try to proceed anyway
  console.log('⚠️ Proceeding with potentially malformed URL - Neon client will validate');
}

// Create Neon HTTP client
console.log('🔧 Creating Neon client...');
const sql = neon(databaseUrl);

// Create Drizzle instance
export const db = drizzle(sql, { schema });

// Export schema for use in other files
export * from './schema';

// Re-export operations for easy access
export * from './operations';