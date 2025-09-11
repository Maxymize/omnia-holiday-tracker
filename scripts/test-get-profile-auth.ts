import fetch from 'node-fetch';

async function testGetProfile() {
  console.log('🔍 Testing get-profile authentication...');
  
  // Test with Authorization header
  const authToken = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJmY2RkZmE2MC1mMTc2LTRmMTEtOTQzMS05NzI0MzM0ZDUwYjIiLCJlbWFpbCI6Im1heC5naXVyYXN0YW50ZUBvbW5pYXNlcnZpY2VzLm5ldCIsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NTc1OTQzMzEsImV4cCI6MTc1NzU5NzkzMX0.Bqf3ZMZ6P7HRy8v3kFsOqEppxBhGv8JBx8s_9R3kwU_SCPSQ';
  
  try {
    console.log('1. Testing with Authorization header...');
    const response1 = await fetch('http://localhost:3000/.netlify/functions/get-profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result1 = await response1.text();
    console.log('Authorization header result:', {
      status: response1.status,
      body: result1
    });
    
    console.log('2. Testing with Cookie...');
    const response2 = await fetch('http://localhost:3000/.netlify/functions/get-profile', {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result2 = await response2.text();
    console.log('Cookie result:', {
      status: response2.status,
      body: result2
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGetProfile();