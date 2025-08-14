#!/usr/bin/env node

/**
 * Database Initialization Script
 * Initializes the database for the Omnia Holiday Tracker
 */

import { runMigrations, getMigrationStatus } from './migrate';
import { db } from './index';
import { testDatabaseConnection } from './helpers';

async function initializeDatabase() {
  console.log('🚀 Initializing Omnia Holiday Tracker Database...\n');
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const connectionTest = await testDatabaseConnection();
    if (!connectionTest.success) {
      throw new Error(`Database connection failed: ${connectionTest.message}`);
    }
    console.log('   ✅ Database connection successful\n');
    
    // Show current migration status
    console.log('2. Checking migration status...');
    await getMigrationStatus();
    
    // Run migrations
    console.log('3. Running database migrations...');
    await runMigrations();
    console.log('   ✅ All migrations completed\n');
    
    // Show final status
    console.log('4. Final migration status:');
    await getMigrationStatus();
    
    console.log('🎉 Database initialization completed successfully!\n');
    console.log('You can now start using the Omnia Holiday Tracker application.');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Database initialization error:', error);
      process.exit(1);
    });
}

export { initializeDatabase };