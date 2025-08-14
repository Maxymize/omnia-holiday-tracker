import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// Support both DATABASE_URL and NETLIFY_DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or NETLIFY_DATABASE_URL environment variable is required');
}

console.log('🔧 Using database URL:', databaseUrl ? 'configured' : 'missing');

// Create Neon HTTP client
const sql = neon(databaseUrl);

// Create Drizzle instance
export const db = drizzle(sql, { schema });

// Export schema for use in other files
export * from './schema';

// Re-export operations for easy access
export * from './operations';