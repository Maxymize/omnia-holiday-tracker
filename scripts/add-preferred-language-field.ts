/**
 * Script to add preferred_language field to users table
 * Run with: npx tsx scripts/add-preferred-language-field.ts
 */

import { neon } from '@neondatabase/serverless';

async function addPreferredLanguageField() {
  try {
    const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('No database URL found in environment variables');
    }
    
    console.log('🔗 Connecting to database...');
    const sql = neon(dbUrl);
    
    console.log('🔧 Adding preferred_language field to users table...');
    
    // Create language enum type if it doesn't exist
    await sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language') THEN
          CREATE TYPE language AS ENUM ('it', 'en', 'es');
        END IF;
      END $$;
    `;
    console.log('✅ Language enum type created/verified');
    
    // Add preferred_language column if it doesn't exist
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS preferred_language language DEFAULT 'it' NOT NULL;
    `;
    console.log('✅ preferred_language column added to users table');
    
    // Update existing users to have Italian as default language
    const updatedUsers = await sql`
      UPDATE users 
      SET preferred_language = 'it' 
      WHERE preferred_language IS NULL;
    `;
    console.log(`✅ Updated ${updatedUsers.length} existing users with default language 'it'`);
    
    // Verify the column was added successfully
    const columnCheck = await sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'preferred_language';
    `;
    
    if (columnCheck.length > 0) {
      console.log('✅ Column verification successful:', columnCheck[0]);
      console.log('🎉 preferred_language field successfully added to users table!');
    } else {
      throw new Error('Column was not created successfully');
    }
    
  } catch (error) {
    console.error('❌ Error adding preferred_language field:', error);
    process.exit(1);
  }
}

// Run the script
addPreferredLanguageField();