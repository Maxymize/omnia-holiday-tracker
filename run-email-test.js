/**
 * Simple script to run the email test function directly
 */

import { config } from 'dotenv';
import { handler } from './netlify/functions/send-test-emails-to-users.ts';

// Load environment variables
config();

console.log('🚀 Running email test for registered users...');
console.log('📧 Using Resend API Key:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
console.log('📧 From Email:', process.env.FROM_EMAIL);
console.log('💾 Database URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

// Mock Netlify Function event
const mockEvent = {
  httpMethod: 'GET',
  headers: {},
  queryStringParameters: {},
  body: null,
  path: '/',
  pathParameters: null,
  requestContext: null,
  resource: '',
  stageVariables: null,
  isBase64Encoded: false
};

const mockContext = {};

// Run the function
handler(mockEvent, mockContext)
  .then(result => {
    console.log('\n🎯 Function Result:');
    console.log('Status Code:', result.statusCode);
    
    try {
      const body = JSON.parse(result.body);
      console.log('\n📊 Response Body:');
      console.log('Success:', body.success);
      console.log('Message:', body.message);
      
      if (body.summary) {
        console.log('\n📈 Summary:');
        console.log(`Total Users: ${body.summary.total}`);
        console.log(`Successful Emails: ${body.summary.successful}`);
        console.log(`Failed Emails: ${body.summary.failed}`);
        console.log(`Success Rate: ${body.summary.successRate}`);
      }
      
      if (body.users) {
        console.log('\n👥 Users Found:');
        body.users.forEach(user => {
          console.log(`- ${user.name} (${user.email}) - ${user.role} - ${user.status}`);
        });
      }
      
      if (body.results) {
        console.log('\n📧 Email Results:');
        body.results.forEach(result => {
          const icon = result.status === 'success' ? '✅' : '❌';
          console.log(`${icon} ${result.user} (${result.email}) - ${result.status}`);
          if (result.messageId) console.log(`   Message ID: ${result.messageId}`);
          if (result.error) console.log(`   Error: ${result.error}`);
        });
      }
      
      console.log('\n📬', body.instructions || 'Check logs for details.');
      
    } catch (parseError) {
      console.log('Response Body (raw):', result.body);
    }
  })
  .catch(error => {
    console.error('❌ Function execution failed:', error);
  });