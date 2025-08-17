import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Support multiple database URL environment variables
// Prioritize in order: UNPOOLED (best for Neon client), then pooled versions
let databaseUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED || 
                  process.env.DATABASE_URL_UNPOOLED || 
                  process.env.NETLIFY_DATABASE_URL || 
                  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('No database URL found in environment variables (checked: NETLIFY_DATABASE_URL_UNPOOLED, DATABASE_URL_UNPOOLED, NETLIFY_DATABASE_URL, DATABASE_URL)');
}

console.log('🔧 Selected database URL source:', 
  process.env.NETLIFY_DATABASE_URL_UNPOOLED ? 'NETLIFY_DATABASE_URL_UNPOOLED' :
  process.env.DATABASE_URL_UNPOOLED ? 'DATABASE_URL_UNPOOLED' :
  process.env.NETLIFY_DATABASE_URL ? 'NETLIFY_DATABASE_URL' :
  'DATABASE_URL'
);

// Clean up the connection string for Neon client compatibility
// Handle both postgres:// and postgresql:// protocols
if (databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
  console.log('🔧 Converting postgres:// to postgresql://');
  databaseUrl = databaseUrl.replace('postgres://', 'postgresql://');
}

// Remove channel_binding parameter if present (not supported by @neondatabase/serverless)
if (databaseUrl.includes('channel_binding')) {
  console.log('🔧 Removing channel_binding parameter from connection string');
  
  // Special handling for malformed URLs that may come from environment variables
  // Sometimes the URL has issues with & vs ? separators
  
  // First, try to normalize any incorrect query string separators
  // If we have /dbname&param instead of /dbname?param, fix it
  const dbNameMatch = databaseUrl.match(/\/([^/?]+)(&|\?)(.+)$/);
  if (dbNameMatch && dbNameMatch[2] === '&') {
    console.log('⚠️ Found malformed query string separator, fixing...');
    databaseUrl = databaseUrl.replace(/\/([^/?]+)&/, '/$1?');
  }
  
  try {
    // Now try URL parsing approach
    const url = new URL(databaseUrl);
    url.searchParams.delete('channel_binding');
    
    // Ensure sslmode is set
    if (!url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require');
    }
    
    databaseUrl = url.toString();
    console.log('✅ Successfully cleaned URL using URL API');
    
  } catch (urlError: any) {
    console.log('⚠️ URL API parsing failed, using fallback string replacement');
    console.log('Parse error:', urlError.message);
    
    // More aggressive fallback - handle all possible malformed cases
    databaseUrl = databaseUrl
      // Remove channel_binding parameter in all positions
      .replace(/channel_binding=require&/g, '')
      .replace(/&channel_binding=require/g, '')
      .replace(/\?channel_binding=require&/g, '?')
      .replace(/\?channel_binding=require$/g, '');
    
    // Clean up any double separators
    databaseUrl = databaseUrl
      .replace(/&&/g, '&')
      .replace(/\?\?/g, '?')
      .replace(/\?&/g, '?');
    
    // Ensure we have a query string separator if we have parameters
    if (databaseUrl.includes('sslmode=') && !databaseUrl.includes('?')) {
      // Find where sslmode starts and add ? before it
      databaseUrl = databaseUrl.replace(/([^?])sslmode=/, '$1?sslmode=');
    }
    
    // Ensure sslmode is present
    if (!databaseUrl.includes('sslmode=')) {
      databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'sslmode=require';
    }
  }
}

// Final validation
console.log('🔧 Validating cleaned URL...');
try {
  const testUrl = new URL(databaseUrl);
  console.log('✅ Database URL validation passed:', {
    protocol: testUrl.protocol,
    hostname: testUrl.hostname,
    pathname: testUrl.pathname,
    hasAuth: testUrl.username !== '',
    queryParams: Array.from(testUrl.searchParams.keys()).join(', ')
  });
} catch (validationError: any) {
  console.error('⚠️ Warning: URL validation failed but proceeding anyway');
  console.error('Validation error:', validationError.message);
  
  // Log masked URL for debugging
  const maskedUrl = databaseUrl.replace(/:\/\/[^@]+@/, '://***:***@');
  console.log('Cleaned URL (masked):', maskedUrl);
}

// Create Neon HTTP client
console.log('🔧 Creating Neon client...');

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });

// Export schema for use in other files
export * from './schema';

// Re-export operations for easy access
export * from './operations';