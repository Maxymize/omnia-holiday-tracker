import fetch from 'node-fetch';

async function testGetProfileSimple() {
  console.log('🔍 Testing get-profile with valid working token...');
  
  try {
    // Use the same cookie that other functions are using successfully
    const response = await fetch('http://localhost:3000/.netlify/functions/get-profile', {
      method: 'GET',
      headers: {
        'Cookie': 'auth-token=eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJmY2RkZmE2MC1mMTc2LTRmMTEtOTQzMS05NzI0MzM0ZDUwYjIiLCJlbWFpbCI6Im1heC5naXVyYXN0YW50ZUBvbW5pYXNlcnZpY2VzLm5ldCIsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NTc1OTQzMzEsImV4cCI6MTc1NzU5NzkzMX0.Bqf3ZMZ6P7HRy8v3kFsOqEppxBhGv8JBx8s_9R3kwU_SCPSQ',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    const result = await response.text();
    console.log('Response body:', result);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGetProfileSimple();