// Test refresh user data functionality
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testRefreshUser() {
  console.log('🔧 Testing refresh user data...');

  // Create employee token (Max Test 01)
  const tokenPayload = {
    userId: '30313924-cc6f-4d10-944b-2b7274b3fce4', // Max Test 01
    email: 'giurmax@icloud.com',
    role: 'employee',
    type: 'access'
  };

  const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log('🔧 Created employee token');

  try {
    const response = await fetch('http://localhost:3000/.netlify/functions/get-profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      }
    });

    const data = await response.json();
    
    console.log('🔧 Response status:', response.status);
    console.log('🔧 Response data:', data);
    
    if (response.ok && data.success) {
      console.log('✅ SUCCESS! User data refreshed');
      console.log('🔧 Current vacation days:', data.user.holidayAllowance);
    } else {
      console.error('❌ Failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testRefreshUser();