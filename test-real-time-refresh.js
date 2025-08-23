// Test real-time refresh functionality
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testRealTimeRefresh() {
  console.log('🧪 Testing real-time refresh functionality...');

  // Create tokens for both admin and employee
  const adminToken = jwt.sign({
    userId: 'fcddfa60-f176-4f11-9431-9724334d50b2', // Admin
    email: 'max.giurastante@omniaservices.net',
    role: 'admin',
    type: 'access'
  }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const employeeToken = jwt.sign({
    userId: '30313924-cc6f-4d10-944b-2b7274b3fce4', // Max Test 01
    email: 'giurmax@icloud.com',
    role: 'employee',
    type: 'access'
  }, process.env.JWT_SECRET, { expiresIn: '1h' });

  console.log('🔧 Created admin and employee tokens');

  try {
    // Step 1: Get current employee vacation days
    console.log('\n📋 Step 1: Get current employee vacation days');
    const initialProfileResponse = await fetch('http://localhost:3000/.netlify/functions/get-profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employeeToken}`,
      }
    });
    
    const initialProfile = await initialProfileResponse.json();
    const currentAllowance = initialProfile.user.holidayAllowance;
    console.log(`   Current vacation days: ${currentAllowance}`);

    // Step 2: Admin updates employee vacation days
    const newAllowance = currentAllowance + 5; // Add 5 days
    console.log(`\n🔧 Step 2: Admin updates employee vacation days to ${newAllowance}`);
    
    const updateResponse = await fetch('http://localhost:3000/.netlify/functions/update-employee-allowance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeId: '30313924-cc6f-4d10-944b-2b7274b3fce4',
        holidayAllowance: newAllowance,
        reason: 'Test real-time refresh functionality'
      }),
    });

    const updateResult = await updateResponse.json();
    console.log('   Update result:', updateResult.success ? '✅ SUCCESS' : '❌ FAILED');
    if (updateResult.success) {
      console.log(`   Updated from ${updateResult.data.previousAllowance} to ${updateResult.data.newAllowance}`);
    }

    // Step 3: Employee fetches updated profile (simulating refresh)
    console.log('\n🔄 Step 3: Employee refreshes profile data');
    const refreshedProfileResponse = await fetch('http://localhost:3000/.netlify/functions/get-profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employeeToken}`,
      }
    });
    
    const refreshedProfile = await refreshedProfileResponse.json();
    const updatedAllowance = refreshedProfile.user.holidayAllowance;
    console.log(`   Updated vacation days: ${updatedAllowance}`);

    // Step 4: Verify the change
    console.log('\n✅ Step 4: Verification');
    if (updatedAllowance === newAllowance) {
      console.log('🎉 SUCCESS! Real-time refresh works correctly');
      console.log(`   Employee now sees ${updatedAllowance} vacation days (was ${currentAllowance})`);
    } else {
      console.error('❌ FAILED! Employee still sees old vacation days');
      console.error(`   Expected: ${newAllowance}, Got: ${updatedAllowance}`);
    }

    // Step 5: Reset to original value
    console.log(`\n🔄 Step 5: Reset to original value (${currentAllowance})`);
    const resetResponse = await fetch('http://localhost:3000/.netlify/functions/update-employee-allowance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        employeeId: '30313924-cc6f-4d10-944b-2b7274b3fce4',
        holidayAllowance: currentAllowance,
        reason: 'Reset after testing real-time refresh functionality'
      }),
    });

    const resetResult = await resetResponse.json();
    console.log('   Reset result:', resetResult.success ? '✅ SUCCESS' : '❌ FAILED');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testRealTimeRefresh();