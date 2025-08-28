import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.NETLIFY_DATABASE_URL_UNPOOLED || 
                         process.env.DATABASE_URL_UNPOOLED ||
                         process.env.NETLIFY_DATABASE_URL || 
                         process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('No database URL found in environment variables (checked: NETLIFY_DATABASE_URL_UNPOOLED, DATABASE_URL_UNPOOLED, NETLIFY_DATABASE_URL, DATABASE_URL)');
}

console.log('🔧 Selected database URL source:', connectionString.includes('NETLIFY_DATABASE_URL_UNPOOLED') ? 'NETLIFY_DATABASE_URL_UNPOOLED' : 'Other');

// Clean the connection string by removing problematic parameters
const cleanConnectionString = (() => {
  console.log('🔧 Removing channel_binding parameter from connection string');
  
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('channel_binding');
    const cleanedUrl = url.toString();
    console.log('✅ Successfully cleaned URL using URL API');
    return cleanedUrl;
  } catch (error) {
    console.log('⚠️ URL parsing failed, using string replacement fallback');
    return connectionString.replace(/[?&]channel_binding=[^&]*/g, '');
  }
})();

// Validate the cleaned URL
console.log('🔧 Validating cleaned URL...');
try {
  const testUrl = new URL(cleanConnectionString);
  console.log('✅ Database URL validation passed:', {
    protocol: testUrl.protocol,
    hostname: testUrl.hostname,
    pathname: testUrl.pathname,
    hasAuth: !!testUrl.username,
    queryParams: testUrl.searchParams.toString()
  });
} catch (error) {
  throw new Error(`Invalid database URL format: ${error}`);
}

console.log('🔧 Creating Neon client...');
const sql_client = neon(cleanConnectionString);
const db = drizzle(sql_client);

async function addJobTitleField() {
  try {
    console.log('🚀 Starting migration: Add job_title field to users table...');

    // Add job_title column to users table
    await sql_client`
      ALTER TABLE users 
      ADD COLUMN job_title TEXT;
    `;
    console.log('✅ Added job_title column to users table');

    // Verify the column was added
    const columnCheck = await sql_client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'job_title';
    `;

    console.log('✅ Migration completed successfully!');
    console.log('📊 New column added:');
    console.table(columnCheck);

    console.log('📝 Migration completed at:', new Date().toISOString());
    console.log('🎯 Users can now add their job titles (e.g., Project Manager, CEO, Developer, etc.)');
    console.log('🏁 Migration script completed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

addJobTitleField();