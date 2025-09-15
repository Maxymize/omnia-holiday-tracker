#!/usr/bin/env tsx

import { up } from '../lib/db/migrations/003_fix_ip_address_length';

/**
 * Script to apply the IP address column fix migration to production database
 *
 * This fixes the production error:
 * "NeonDbError: value too long for type character varying(45)"
 */
async function applyMigration() {
  console.log('🚀 Applying IP address column fix migration...');

  try {
    await up();
    console.log('✅ Migration applied successfully!');
    console.log('🎉 Production holiday approval should now work without errors');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();