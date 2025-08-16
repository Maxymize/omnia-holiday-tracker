import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Support multiple database URL environment variables
// Prefer NETLIFY_DATABASE_URL_UNPOOLED for better compatibility with Neon client
let databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL, NETLIFY_DATABASE_URL_UNPOOLED, or NETLIFY_DATABASE_URL environment variable is required');
}

// Clean up the connection string for Neon client compatibility
// Use proper URL parsing to safely remove unsupported parameters
try {
  const url = new URL(databaseUrl);
  
  // Remove channel_binding parameter if present (not supported by @neondatabase/serverless)
  if (url.searchParams.has('channel_binding')) {
    console.log('🔧 Removing unsupported channel_binding parameter from connection string');
    url.searchParams.delete('channel_binding');
  }
  
  // Ensure sslmode is set for production
  if (!url.searchParams.has('sslmode')) {
    url.searchParams.set('sslmode', 'require');
  }
  
  // Reconstruct the URL
  databaseUrl = url.toString();
  
  console.log('🔧 Database connection configured successfully');
  console.log('🔧 URL structure validation:', {
    protocol: url.protocol,
    host: url.host,
    pathname: url.pathname,
    hasQueryParams: url.searchParams.toString() !== '',
    sslmode: url.searchParams.get('sslmode'),
    channel_binding: url.searchParams.has('channel_binding') ? 'present (will be removed)' : 'not present'
  });
  
} catch (urlError) {
  console.error('❌ Failed to parse database URL:', urlError);
  console.error('Raw URL (masked):', databaseUrl.replace(/://[^@]+@/, '://***:***@'));
  throw new Error('Invalid database connection string format');
}

// Create Neon HTTP client
const sql = neon(databaseUrl);

// Create Drizzle instance
export const db = drizzle(sql, { schema });

// Export schema for use in other files
export * from './schema';

// Re-export operations for easy access
export * from './operations';