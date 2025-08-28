/**
 * Migration Script: Add Phone and Avatar fields to Users table
 * Version: 2.4.1
 * Purpose: Extend user profile functionality with phone number and avatar image
 */

import { sql } from 'drizzle-orm';
import { db } from '../lib/db/index.js';

async function addProfileFields() {
  console.log('🚀 Starting migration: Add phone and avatar fields to users table...');

  try {
    // Add phone column (optional text field)
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone TEXT;
    `);
    console.log('✅ Added phone column to users table');

    // Add avatarUrl column (optional text field for image URL)
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);
    console.log('✅ Added avatar_url column to users table');

    // Verify the changes by checking if columns exist
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('phone', 'avatar_url');
    `);

    console.log('✅ Migration completed successfully!');
    console.log('📊 New columns added:');
    console.table(result.rows);

    // Log migration completion
    console.log(`📝 Migration completed at: ${new Date().toISOString()}`);
    console.log('🎯 Users can now update their phone numbers and avatar images');
    
    return { success: true, message: 'Profile fields migration completed successfully' };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Execute migration if run directly
if (require.main === module) {
  addProfileFields()
    .then(() => {
      console.log('🏁 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { addProfileFields };