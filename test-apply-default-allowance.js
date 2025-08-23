// Test apply default allowance functionality
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testApplyDefaultAllowance() {
  console.log('🧪 Testing apply default allowance functionality...');

  // Create admin token
  const adminToken = jwt.sign({
    userId: 'fcddfa60-f176-4f11-9431-9724334d50b2', // Admin
    email: 'max.giurastante@omniaservices.net',
    role: 'admin',
    type: 'access'
  }, process.env.JWT_SECRET, { expiresIn: '1h' });

  console.log('🔧 Created admin token');

  try {
    // Step 1: Check current state
    console.log('\n📋 Step 1: Check current users state');
    // This will be visible in the server logs when called

    // Step 2: Apply default allowance to all users
    console.log('\n🔧 Step 2: Apply default allowance to all users');
    const applyResponse = await fetch('http://localhost:3000/.netlify/functions/apply-default-allowance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      }
    });

    const applyResult = await applyResponse.json();
    console.log('   Apply result:', applyResponse.status === 200 ? '✅ SUCCESS' : '❌ FAILED');
    
    if (applyResult.success) {
      console.log(`   ✅ Applied ${applyResult.data.defaultAllowance} days to ${applyResult.data.updatedCount} out of ${applyResult.data.totalUsers} users`);
      console.log('   📋 Updates:');
      applyResult.data.updates.forEach(update => {
        console.log(`      - ${update.name}: ${update.previousAllowance} → ${update.newAllowance}`);
      });
    } else {
      console.error('   ❌ Error:', applyResult.error);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testApplyDefaultAllowance();