import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

function getDbConnection() {
  const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
                process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('No database connection URL available');
  }

  console.log('🔧 Selected database URL source:', dbUrl.startsWith('postgresql://') ? 'NETLIFY_DATABASE_URL_UNPOOLED' : 'DATABASE_URL');

  // Clean up the URL to remove unsupported parameters for neon client
  let cleanedUrl = dbUrl;
  if (cleanedUrl.includes('channel_binding=require')) {
    console.log('🔧 Removing channel_binding parameter from connection string');
    cleanedUrl = cleanedUrl.replace(/[?&]channel_binding=require/, '');
    cleanedUrl = cleanedUrl.replace(/channel_binding=require[&]?/, '');
  }

  // Additional cleanup for malformed URLs
  cleanedUrl = cleanedUrl.replace(/&sslmode=require$/, '?sslmode=require');
  cleanedUrl = cleanedUrl.replace(/&&/g, '&');
  cleanedUrl = cleanedUrl.replace(/\?&/g, '?');

  try {
    const url = new URL(cleanedUrl);
    console.log('✅ Successfully cleaned URL using URL API');
  } catch (error) {
    console.log('⚠️ URL parsing failed, using original URL:', error);
    cleanedUrl = dbUrl;
  }

  console.log('🔧 Creating Neon client...');
  return neon(cleanedUrl);
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed - POST only' })
    };
  }

  try {
    const sql = getDbConnection();

    console.log('🔧 Creating medical_certificates table if not exists...');

    // Create the table with the exact structure from our schema
    await sql`
      CREATE TABLE IF NOT EXISTS medical_certificates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        file_id text NOT NULL,
        holiday_request_id uuid NOT NULL,
        original_file_name text NOT NULL,
        mime_type text NOT NULL,
        file_size integer NOT NULL,
        encrypted_data text NOT NULL,
        encryption_method text DEFAULT 'XOR' NOT NULL,
        uploaded_by uuid NOT NULL,
        uploaded_at timestamp DEFAULT now() NOT NULL,
        expires_at timestamp,
        download_count integer DEFAULT 0 NOT NULL,
        last_download_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        CONSTRAINT medical_certificates_file_id_unique UNIQUE(file_id)
      );
    `;

    console.log('✅ medical_certificates table created successfully');

    // Add foreign key constraints if they don't exist
    try {
      await sql`
        ALTER TABLE medical_certificates
        ADD CONSTRAINT IF NOT EXISTS medical_certificates_holiday_request_id_holidays_id_fk
        FOREIGN KEY (holiday_request_id) REFERENCES holidays(id) ON DELETE no action ON UPDATE no action;
      `;

      await sql`
        ALTER TABLE medical_certificates
        ADD CONSTRAINT IF NOT EXISTS medical_certificates_uploaded_by_users_id_fk
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE no action ON UPDATE no action;
      `;

      console.log('✅ Foreign key constraints added successfully');
    } catch (fkError) {
      console.log('⚠️ Foreign key constraints may already exist:', fkError);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'medical_certificates table created successfully'
      })
    };

  } catch (error) {
    console.error('❌ Error creating medical_certificates table:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create table',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};