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
// Remove channel_binding parameter which is not supported by @neondatabase/serverless
if (databaseUrl.includes('channel_binding=require')) {
  console.log('🔧 Cleaning connection string: removing channel_binding parameter');
  databaseUrl = databaseUrl.replace(/[&?]channel_binding=require/g, '');
}

// Ensure sslmode is set correctly for production
if (!databaseUrl.includes('sslmode=')) {
  databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'sslmode=require';
}

console.log('🔧 Database connection configured:', databaseUrl.replace(/:\/\/[^@]+@/, '://***:***@'));

// Create Neon HTTP client
const sql = neon(databaseUrl);

// Create Drizzle instance
export const db = drizzle(sql, { schema });

// Export schema for use in other files
export * from './schema';

// Re-export operations for easy access
export * from './operations';