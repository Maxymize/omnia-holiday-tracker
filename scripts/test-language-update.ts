import { neon } from '@neondatabase/serverless';

async function testLanguageUpdate() {
  const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('No database URL available');
    process.exit(1);
  }

  const sql = neon(dbUrl);
  
  try {
    // Get employee test user
    const employee = await sql`
      SELECT id, name, email, preferred_language
      FROM users 
      WHERE email = 'giurmax@icloud.com'
      LIMIT 1
    `;
    
    if (!employee[0]) {
      console.log('❌ Employee user not found');
      return;
    }
    
    console.log('🔍 Current employee language:', employee[0].preferred_language);
    
    // Update to English
    console.log('🔄 Updating language to English...');
    const updateResult = await sql`
      UPDATE users 
      SET preferred_language = 'en', updated_at = NOW()
      WHERE id = ${employee[0].id}
      RETURNING id, email, preferred_language, updated_at
    `;
    
    console.log('✅ Update result:', updateResult[0]);
    
    // Test Drizzle ORM query format 
    console.log('\n🔍 Testing Drizzle-style query...');
    const drizzleTest = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.department_id as "departmentId",
        d.name as "departmentName",
        u.holiday_allowance as "holidayAllowance", 
        u.phone,
        u.avatar_url as "avatarUrl",
        u.job_title as "jobTitle",
        u.preferred_language as "preferredLanguage",
        u.created_at as "createdAt",
        u.updated_at as "updatedAt"
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ${employee[0].id}
      LIMIT 1
    `;
    
    console.log('✅ Drizzle query result:');
    console.log(JSON.stringify(drizzleTest[0], null, 2));
    
    // Test if the update worked in middleware context
    console.log('\n🧪 Simulating middleware query...');
    const middlewareTest = await sql`
      SELECT preferred_language 
      FROM users 
      WHERE id = ${employee[0].id}
      LIMIT 1
    `;
    
    console.log('✅ Middleware query result:', middlewareTest[0]);
    
    // Change back to Italian for consistency
    await sql`
      UPDATE users 
      SET preferred_language = 'it', updated_at = NOW()
      WHERE id = ${employee[0].id}
    `;
    
    console.log('✅ Language reset to Italian for consistency');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testLanguageUpdate();