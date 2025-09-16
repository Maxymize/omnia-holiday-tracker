import { neon } from '@neondatabase/serverless';

// Initialize SQL client
const sql = neon(process.env.NETLIFY_DATABASE_URL_UNPOOLED || '');

async function cleanupFakeRecords() {
  console.log('🧹 Starting cleanup of fake medical certificate records...');

  try {
    // First, let's see what we're about to delete
    const fakeRecords = await sql`
      SELECT id, file_id, original_file_name, holiday_request_id, uploaded_by
      FROM medical_certificates
      WHERE holiday_request_id = '00000000-0000-0000-0000-000000000000'
         OR uploaded_by = '00000000-0000-0000-0000-000000000000'
    `;

    console.log(`📋 Found ${fakeRecords.length} records with fake UUIDs:`);
    fakeRecords.forEach(record => {
      console.log(`  - ID: ${record.id}, File: ${record.original_file_name}`);
    });

    if (fakeRecords.length === 0) {
      console.log('✅ No fake UUID records found to clean up');
      return;
    }

    // Delete the fake records
    const deleteResult = await sql`
      DELETE FROM medical_certificates
      WHERE holiday_request_id = '00000000-0000-0000-0000-000000000000'
         OR uploaded_by = '00000000-0000-0000-0000-000000000000'
    `;

    console.log('🗑️ Delete result:', deleteResult);

    // Verify cleanup
    const remainingFakeRecords = await sql`
      SELECT COUNT(*) as count
      FROM medical_certificates
      WHERE holiday_request_id = '00000000-0000-0000-0000-000000000000'
         OR uploaded_by = '00000000-0000-0000-0000-000000000000'
    `;

    const deletedCount = fakeRecords.length;
    const remainingCount = parseInt(remainingFakeRecords[0]?.count || '0');

    console.log(`✅ Cleanup completed: deleted ${deletedCount} fake records, ${remainingCount} remaining`);

  } catch (error) {
    console.error('❌ Error cleaning up fake medical records:', error);
    throw error;
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupFakeRecords()
    .then(() => {
      console.log('🎉 Cleanup script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup script failed:', error);
      process.exit(1);
    });
}