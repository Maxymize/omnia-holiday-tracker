/**
 * Test Email System for OMNIA HOLIDAY TRACKER
 * Tests all email notification workflows
 */

import { Handler } from '@netlify/functions';

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const baseUrl = process.env.SITE_URL || process.env.URL || 'https://omnia-holiday-tracker.netlify.app';
    const testEmail = 'max.giurastante@omniaservices.net';
    
    console.log('🧪 Starting email system comprehensive test...');
    console.log('Base URL:', baseUrl);
    console.log('Test email:', testEmail);

    const testResults = {
      emailService: false,
      employeeRegistration: false,
      holidayRequest: false,
      holidayApproval: false,
      holidayRejection: false,
      employeeApproval: false,
      errors: [] as string[]
    };

    // Test 1: Email Service Basic Test
    console.log('\n📧 Test 1: Email Service Basic Test');
    try {
      const emailServiceResponse = await fetch(`${baseUrl}/.netlify/functions/email-service?test=true&to=${testEmail}`);
      const emailServiceResult = await emailServiceResponse.json();
      
      if (emailServiceResponse.ok && emailServiceResult.success) {
        console.log('✅ Email service test passed');
        testResults.emailService = true;
      } else {
        console.error('❌ Email service test failed:', emailServiceResult);
        testResults.errors.push('Email service basic test failed');
      }
    } catch (error) {
      console.error('❌ Email service test error:', error);
      testResults.errors.push(`Email service error: ${error}`);
    }

    // Test 2: Employee Registration Notification
    console.log('\n🆕 Test 2: Employee Registration Notification');
    try {
      const registrationData = {
        action: 'employee_registration',
        userData: {
          name: 'Test Employee',
          email: 'test.employee@omniaservices.net',
          department: 'IT Department',
          jobTitle: 'Software Developer',
          phone: '+39 123 456 7890',
          holidayAllowance: 25
        }
      };

      const registrationResponse = await fetch(`${baseUrl}/.netlify/functions/email-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      const registrationResult = await registrationResponse.json();
      
      if (registrationResponse.ok && registrationResult.success) {
        console.log('✅ Employee registration notification test passed');
        testResults.employeeRegistration = true;
      } else {
        console.error('❌ Employee registration notification test failed:', registrationResult);
        testResults.errors.push('Employee registration notification failed');
      }
    } catch (error) {
      console.error('❌ Employee registration notification error:', error);
      testResults.errors.push(`Employee registration error: ${error}`);
    }

    // Test 3: Holiday Request Notification
    console.log('\n🏖️ Test 3: Holiday Request Notification');
    try {
      const holidayRequestData = {
        action: 'holiday_request_submitted',
        userData: {
          name: 'Test Employee',
          email: 'test.employee@omniaservices.net',
          department: 'IT Department'
        },
        holidayData: {
          startDate: '2025-12-20',
          endDate: '2025-12-31',
          type: 'vacation',
          workingDays: 8,
          notes: 'Christmas holidays',
          status: 'pending'
        }
      };

      const holidayRequestResponse = await fetch(`${baseUrl}/.netlify/functions/email-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayRequestData)
      });

      const holidayRequestResult = await holidayRequestResponse.json();
      
      if (holidayRequestResponse.ok && holidayRequestResult.success) {
        console.log('✅ Holiday request notification test passed');
        testResults.holidayRequest = true;
      } else {
        console.error('❌ Holiday request notification test failed:', holidayRequestResult);
        testResults.errors.push('Holiday request notification failed');
      }
    } catch (error) {
      console.error('❌ Holiday request notification error:', error);
      testResults.errors.push(`Holiday request error: ${error}`);
    }

    // Test 4: Holiday Approval Notification
    console.log('\n✅ Test 4: Holiday Approval Notification');
    try {
      const holidayApprovalData = {
        action: 'holiday_request_approved',
        userData: {
          name: 'Test Employee',
          email: testEmail
        },
        holidayData: {
          startDate: '2025-12-20',
          endDate: '2025-12-31',
          type: 'vacation',
          workingDays: 8,
          approvedBy: 'Admin Manager'
        }
      };

      const holidayApprovalResponse = await fetch(`${baseUrl}/.netlify/functions/email-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayApprovalData)
      });

      const holidayApprovalResult = await holidayApprovalResponse.json();
      
      if (holidayApprovalResponse.ok && holidayApprovalResult.success) {
        console.log('✅ Holiday approval notification test passed');
        testResults.holidayApproval = true;
      } else {
        console.error('❌ Holiday approval notification test failed:', holidayApprovalResult);
        testResults.errors.push('Holiday approval notification failed');
      }
    } catch (error) {
      console.error('❌ Holiday approval notification error:', error);
      testResults.errors.push(`Holiday approval error: ${error}`);
    }

    // Test 5: Holiday Rejection Notification
    console.log('\n❌ Test 5: Holiday Rejection Notification');
    try {
      const holidayRejectionData = {
        action: 'holiday_request_rejected',
        userData: {
          name: 'Test Employee',
          email: testEmail
        },
        holidayData: {
          startDate: '2025-12-20',
          endDate: '2025-12-31',
          type: 'vacation',
          workingDays: 8,
          rejectedBy: 'Admin Manager',
          rejectionReason: 'Periodo di alta stagione - richiedi date alternative'
        }
      };

      const holidayRejectionResponse = await fetch(`${baseUrl}/.netlify/functions/email-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayRejectionData)
      });

      const holidayRejectionResult = await holidayRejectionResponse.json();
      
      if (holidayRejectionResponse.ok && holidayRejectionResult.success) {
        console.log('✅ Holiday rejection notification test passed');
        testResults.holidayRejection = true;
      } else {
        console.error('❌ Holiday rejection notification test failed:', holidayRejectionResult);
        testResults.errors.push('Holiday rejection notification failed');
      }
    } catch (error) {
      console.error('❌ Holiday rejection notification error:', error);
      testResults.errors.push(`Holiday rejection error: ${error}`);
    }

    // Test 6: Employee Approval Notification
    console.log('\n🎉 Test 6: Employee Approval Notification');
    try {
      const employeeApprovalData = {
        action: 'employee_approved',
        userData: {
          name: 'Test Employee',
          email: testEmail
        }
      };

      const employeeApprovalResponse = await fetch(`${baseUrl}/.netlify/functions/email-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeApprovalData)
      });

      const employeeApprovalResult = await employeeApprovalResponse.json();
      
      if (employeeApprovalResponse.ok && employeeApprovalResult.success) {
        console.log('✅ Employee approval notification test passed');
        testResults.employeeApproval = true;
      } else {
        console.error('❌ Employee approval notification test failed:', employeeApprovalResult);
        testResults.errors.push('Employee approval notification failed');
      }
    } catch (error) {
      console.error('❌ Employee approval notification error:', error);
      testResults.errors.push(`Employee approval error: ${error}`);
    }

    // Calculate overall results
    const totalTests = 6;
    const passedTests = Object.values(testResults).filter(result => result === true).length;
    const successRate = Math.round((passedTests / totalTests) * 100);

    console.log('\n📊 Email System Test Results Summary:');
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests (${successRate}%)`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);

    if (testResults.errors.length > 0) {
      console.log('\n🔍 Error Details:');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: passedTests > 0,
        testResults,
        summary: {
          total: totalTests,
          passed: passedTests,
          failed: totalTests - passedTests,
          successRate: `${successRate}%`
        },
        errors: testResults.errors,
        message: passedTests === totalTests 
          ? '🎉 All email tests passed! The email system is working correctly.' 
          : `⚠️ ${passedTests}/${totalTests} email tests passed. Check errors for details.`,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error: any) {
    console.error('❌ Email system test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Email system test failed',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};