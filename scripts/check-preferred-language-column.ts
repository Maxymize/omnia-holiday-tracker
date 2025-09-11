import { neon } from '@neondatabase/serverless';

async function checkColumn() {
  const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('No database URL available');
    process.exit(1);
  }

  const sql = neon(dbUrl);
  
  try {
    // Check if preferred_language column exists
    const result = await sql`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'preferred_language'
    `;
    
    console.log('Column check result:', result);
    
    if (result.length === 0) {
      console.log('❌ preferred_language column does NOT exist in users table');
      
      // Show all columns in users table
      const allColumns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `;
      
      console.log('All columns in users table:');
      allColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('✅ preferred_language column EXISTS in users table');
      console.log('Column details:', result[0]);
    }
    
  } catch (error) {
    console.error('Error checking column:', error);
  }
}

checkColumn();