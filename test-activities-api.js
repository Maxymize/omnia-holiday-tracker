// Simple test script to verify the activities API functions work correctly
// Run with: node test-activities-api.js

const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:8888/.netlify/functions';
const TEST_TOKEN = process.env.TEST_ADMIN_TOKEN; // You'll need a valid admin token

async function testGetActivities() {
  console.log('🔍 Testing GET /get-activities...');
  
  try {
    const response = await fetch(`${BASE_URL}/get-activities?page=1&limit=5&type=all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ GET /get-activities test passed');
    } else {
      console.log('❌ GET /get-activities test failed');
    }
  } catch (error) {
    console.log('❌ GET /get-activities test error:', error.message);
  }
}

async function testDeleteActivities() {
  console.log('🗑️ Testing DELETE /delete-activities...');
  
  try {
    // Test with empty array (should fail validation)
    const response = await fetch(`${BASE_URL}/delete-activities`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        activityIds: [] // Empty array should fail validation
      })
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.status === 400) {
      console.log('✅ DELETE /delete-activities validation test passed (correctly rejected empty array)');
    } else {
      console.log('❌ DELETE /delete-activities validation test failed');
    }
  } catch (error) {
    console.log('❌ DELETE /delete-activities test error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Activities API Tests\n');
  
  if (!TEST_TOKEN) {
    console.log('⚠️ TEST_ADMIN_TOKEN environment variable not set. Skipping tests.');
    console.log('To run tests:');
    console.log('1. Get a valid admin token from /netlify/functions/login');
    console.log('2. Set TEST_ADMIN_TOKEN environment variable');
    console.log('3. Run: TEST_ADMIN_TOKEN=your_token node test-activities-api.js');
    return;
  }
  
  await testGetActivities();
  console.log('');
  await testDeleteActivities();
  
  console.log('\n🏁 Tests completed');
}

runTests().catch(console.error);