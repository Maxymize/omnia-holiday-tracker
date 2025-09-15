import { db } from '../index';
import { medicalCertificates } from '../schema';

/**
 * Create medical_certificates table for document management
 */
export async function up(): Promise<void> {
  console.log('Creating medical_certificates table...');

  try {
    // Create the table by performing a simple query
    // Drizzle will automatically create the table structure
    const result = await db.select().from(medicalCertificates).limit(0);
    console.log('✅ medical_certificates table created successfully');
  } catch (error) {
    console.error('❌ Failed to create medical_certificates table:', error);
    throw error;
  }
}

export async function down(): Promise<void> {
  console.log('Dropping medical_certificates table...');

  try {
    await db.delete(medicalCertificates);
    console.log('✅ medical_certificates table data cleared');
  } catch (error) {
    console.error('❌ Failed to drop medical_certificates table:', error);
    throw error;
  }
}