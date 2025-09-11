import { neon } from '@neondatabase/serverless';

async function testProfileAPI() {
  const dbUrl = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('No database URL available');
    process.exit(1);
  }

  const sql = neon(dbUrl);
  
  try {
    // Test direct database query for user profile with all fields
    console.log('🔍 Testing direct database query...');
    
    const userQuery = await sql`
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
      WHERE u.email = 'max.giurastante@omniaservices.net'
      LIMIT 1
    `;
    
    console.log('✅ Direct database query result:');
    console.log(JSON.stringify(userQuery[0], null, 2));
    
    // Test with employee user too
    const employeeQuery = await sql`
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
      WHERE u.email = 'giurmax@icloud.com'
      LIMIT 1
    `;
    
    console.log('\n🔍 Employee user query result:');
    console.log(JSON.stringify(employeeQuery[0], null, 2));
    
    // Test updating preferred language
    if (employeeQuery[0]) {
      console.log('\n🔄 Testing preferred language update...');
      const updateResult = await sql`
        UPDATE users 
        SET preferred_language = 'en', updated_at = NOW()
        WHERE id = ${employeeQuery[0].id}
        RETURNING preferred_language
      `;
      
      console.log('Update result:', updateResult[0]);
      
      // Query again to confirm
      const confirmQuery = await sql`
        SELECT preferred_language
        FROM users
        WHERE id = ${employeeQuery[0].id}
      `;
      
      console.log('Confirmed preferred language:', confirmQuery[0]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testProfileAPI();