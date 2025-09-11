/**
 * Email Service for OMNIA HOLIDAY TRACKER
 * Handles email sending, queuing, and delivery tracking using Resend API
 * Supports holiday workflow notifications with multi-language templates
 */

import { neon } from '@neondatabase/serverless';

// Email service configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'holidays@omniaservices.net';

console.log('🔧 Holiday Tracker Email Service Configuration:');
console.log('- RESEND_API_KEY:', RESEND_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- FROM_EMAIL:', FROM_EMAIL);

/**
 * Create standardized response
 */
const createResponse = (statusCode: number, data: any, message: string | null = null) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  },
  body: JSON.stringify({
    success: statusCode < 400,
    message,
    data,
    timestamp: new Date().toISOString()
  })
});

/**
 * Send email using Resend API
 */
async function sendEmailViaResend(to: string | string[], subject: string, htmlContent: string, textContent: string | null = null) {
  try {
    console.log('🔧 Initializing Resend with API key:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
    console.log('🔧 API key length:', process.env.RESEND_API_KEY?.length || 0);
    console.log('🔧 API key starts with:', process.env.RESEND_API_KEY?.substring(0, 8) || 'NONE');

    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Dynamic import to ensure fresh module loading
    const { Resend } = await import('resend');
    console.log('✅ Resend module imported successfully');
    
    const resendClient = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend instance created');

    const emailData: any = {
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: htmlContent
    };

    if (textContent) {
      emailData.text = textContent;
    }

    console.log('📧 Sending holiday email via Resend API:', {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from
    });

    const result = await resendClient.emails.send(emailData);
    
    console.log('✅ Resend API success:', result);

    if (result.error) {
      throw new Error(`Resend API error: ${result.error.message}`);
    }

    console.log('✅ Holiday email sent successfully:', result.data?.id || 'No ID returned');

    return {
      success: true,
      messageId: result.data?.id,
      response: result.data
    };
  } catch (error: any) {
    console.error('❌ Detailed Resend error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
      response: error.response?.data || 'No response data'
    });

    // Check if it's an API key issue
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      return { 
        success: false, 
        error: `Invalid Resend API key. Check your RESEND_API_KEY environment variable.` 
      };
    }

    // Check if it's a network issue
    if (error.message?.includes('ENOTFOUND') || error.message?.includes('network')) {
      return { 
        success: false, 
        error: `Network error connecting to Resend API: ${error.message}` 
      };
    }

    return { 
      success: false, 
      error: `Resend API error: ${error.message || 'Unknown error'}`,
      details: error.toString()
    };
  }
}

/**
 * Send test email for holiday system
 */
async function sendTestEmail(recipientEmail: string) {
  const subject = '🧪 OMNIA HOLIDAY TRACKER - Test Email';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          .success-box { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏖️ Holiday Tracker Test Email</h1>
          </div>
          <div class="content">
            <div class="success-box">
              <h2>✅ Email System Working!</h2>
              <p>This is a test email from OMNIA HOLIDAY TRACKER email service.</p>
            </div>
            
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>📧 Recipient: ${recipientEmail}</li>
              <li>🕐 Sent: ${new Date().toISOString()}</li>
              <li>🔧 Service: Resend API</li>
              <li>📤 From: ${FROM_EMAIL}</li>
            </ul>
            
            <p>If you received this email, the holiday notification system is working correctly!</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 OmniaServices. All rights reserved.</p>
            <p>This is a test message from OMNIA HOLIDAY TRACKER system.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return await sendEmailViaResend(recipientEmail, subject, htmlContent);
}

/**
 * Get email queue status
 */
async function getEmailQueueStatus() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Get queue statistics
    const stats = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM email_queue 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY status
    `;

    const totalToday = await sql`
      SELECT COUNT(*) as count
      FROM email_queue 
      WHERE created_at >= CURRENT_DATE
    `;

    const pending = await sql`
      SELECT COUNT(*) as count
      FROM email_queue 
      WHERE status = 'pending'
    `;

    const recentEmails = await sql`
      SELECT 
        id,
        recipient_email,
        subject,
        status,
        created_at,
        sent_at,
        error_message
      FROM email_queue 
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return {
      success: true,
      statusCounts: stats.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, { pending: 0, sent: 0, failed: 0 }),
      totalToday: parseInt(totalToday[0]?.count || 0),
      pendingCount: parseInt(pending[0]?.count || 0),
      recentEmails,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('❌ Error getting email queue status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process email queue
 */
async function processEmailQueue() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // Get pending emails (max 5 at a time)
    const pendingEmails = await sql`
      SELECT * FROM email_queue 
      WHERE status = 'pending' 
      AND (scheduled_for IS NULL OR scheduled_for <= NOW())
      ORDER BY created_at ASC 
      LIMIT 5
    `;

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const email of pendingEmails) {
      results.processed++;

      try {
        // Send email
        const sendResult = await sendEmailViaResend(
          email.recipient_email,
          email.subject,
          email.content
        );

        if (sendResult.success) {
          // Update as sent
          await sql`
            UPDATE email_queue 
            SET status = 'sent', 
                sent_at = NOW(),
                error_message = NULL
            WHERE id = ${email.id}
          `;
          results.successful++;
        } else {
          // Update as failed
          await sql`
            UPDATE email_queue 
            SET status = 'failed', 
                error_message = ${sendResult.error}
            WHERE id = ${email.id}
          `;
          results.failed++;
          results.errors.push({
            emailId: email.id,
            recipient: email.recipient_email,
            error: sendResult.error
          });
        }
      } catch (error: any) {
        // Update as failed
        await sql`
          UPDATE email_queue 
          SET status = 'failed', 
              error_message = ${error.message}
          WHERE id = ${email.id}
        `;
        results.failed++;
        results.errors.push({
          emailId: email.id,
          recipient: email.recipient_email,
          error: error.message
        });
      }
    }

    return {
      success: true,
      ...results
    };
  } catch (error: any) {
    console.error('❌ Error processing email queue:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Queue an email for sending
 */
async function queueEmail(recipientEmail: string, subject: string, content: string, templateName: string | null = null) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    const result = await sql`
      INSERT INTO email_queue (
        recipient_email, 
        subject, 
        content, 
        template_name,
        status,
        created_at
      ) VALUES (
        ${recipientEmail},
        ${subject},
        ${content},
        ${templateName},
        'pending',
        NOW()
      )
      RETURNING id
    `;

    return {
      success: true,
      emailId: result[0].id
    };
  } catch (error: any) {
    console.error('❌ Error queueing email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main handler function
 */
export const handler = async (event: any, context: any) => {
  console.log(`📨 Holiday Email Service Request: ${event.httpMethod} ${event.path}`);
  console.log('Query parameters:', event.queryStringParameters);
  console.log('Headers:', Object.keys(event.headers || {}));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, null, 'CORS preflight');
  }

  try {
    const query = event.queryStringParameters || {};
    
    // Handle GET requests with query parameters
    if (event.httpMethod === 'GET') {
      
      // Test email endpoint
      if (query.test === 'true' && query.to) {
        console.log('🧪 Processing holiday test email request');
        const result = await sendTestEmail(query.to);
        return createResponse(
          result.success ? 200 : 500,
          result,
          result.success ? 'Test email sent successfully' : 'Failed to send test email'
        );
      }
      
      // Check queue status
      if (query.checkQueue === 'true') {
        console.log('📊 Processing queue status request');
        const result = await getEmailQueueStatus();
        return createResponse(
          result.success ? 200 : 500,
          result,
          result.success ? 'Queue status retrieved' : 'Failed to get queue status'
        );
      }
      
      // Process queue
      if (query.processQueue === 'true') {
        console.log('⚙️ Processing email queue');
        const result = await processEmailQueue();
        return createResponse(
          result.success ? 200 : 500,
          result,
          result.success ? 'Queue processed successfully' : 'Failed to process queue'
        );
      }
      
      // Default GET response - show service status
      return createResponse(200, {
        service: 'OMNIA HOLIDAY TRACKER Email Service',
        status: 'running',
        resendConfigured: !!RESEND_API_KEY,
        fromEmail: FROM_EMAIL,
        availableEndpoints: {
          'GET /?test=true&to=max.giurastante@omniaservices.net': 'Send test email',
          'GET /?checkQueue=true': 'Check email queue status',
          'GET /?processQueue=true': 'Process pending emails',
          'POST with action': 'Various holiday email actions'
        }
      }, 'Holiday email service is running');
    }
    
    // Handle POST requests
    if (event.httpMethod === 'POST') {
      let body: any = {};
      
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        return createResponse(400, null, 'Invalid JSON in request body');
      }
      
      const { action } = body;
      console.log(`🎬 Processing POST action: ${action}`);
      
      switch (action) {
        case 'test_email':
          if (!body.to) {
            return createResponse(400, null, 'Missing "to" parameter');
          }
          const testResult = await sendTestEmail(body.to);
          return createResponse(
            testResult.success ? 200 : 500,
            testResult,
            testResult.success ? 'Test email sent' : 'Failed to send test email'
          );
          
        case 'send_immediate':
          const { to, subject, htmlContent, textContent } = body;
          if (!to || !subject || !htmlContent) {
            return createResponse(400, null, 'Missing required parameters: to, subject, htmlContent');
          }
          const sendResult = await sendEmailViaResend(to, subject, htmlContent, textContent);
          
          // Log successful emails to database for tracking
          if (sendResult.success && sendResult.messageId) {
            try {
              console.log('📊 Logging email to database for tracking...');
              const sql = neon(process.env.DATABASE_URL!);
              
              await sql`
                INSERT INTO email_queue 
                (recipient_email, subject, content, template_name, status, scheduled_for, sent_at, created_at)
                VALUES (
                  ${Array.isArray(to) ? to[0] : to},
                  ${subject}, 
                  ${htmlContent || textContent || 'No content'},
                  'system_email',
                  'sent',
                  NOW(),
                  NOW(),
                  NOW()
                )
              `;
              
              console.log('📊 Email logged to database for tracking successfully');
            } catch (trackingError) {
              console.error('⚠️ Failed to log email for tracking:', trackingError);
              // Don't fail the email sending if tracking fails
            }
          }
          
          return createResponse(
            sendResult.success ? 200 : 500,
            sendResult,
            sendResult.success ? 'Email sent immediately' : 'Failed to send email'
          );
          
        case 'queue_email':
          const { recipientEmail, subject: queueSubject, content, templateName } = body;
          if (!recipientEmail || !queueSubject || !content) {
            return createResponse(400, null, 'Missing required parameters: recipientEmail, subject, content');
          }
          const queueResult = await queueEmail(recipientEmail, queueSubject, content, templateName);
          return createResponse(
            queueResult.success ? 200 : 500,
            queueResult,
            queueResult.success ? 'Email queued successfully' : 'Failed to queue email'
          );
          
        case 'process_queue':
          const processResult = await processEmailQueue();
          return createResponse(
            processResult.success ? 200 : 500,
            processResult,
            processResult.success ? 'Queue processed' : 'Failed to process queue'
          );
          
        default:
          return createResponse(400, null, `Unknown action: ${action}. Available actions: test_email, send_immediate, queue_email, process_queue`);
      }
    }
    
    // Method not allowed
    return createResponse(405, null, `Method ${event.httpMethod} not allowed`);
    
  } catch (error: any) {
    console.error('❌ Holiday email service error:', error);
    return createResponse(500, { error: error.message }, 'Internal server error');
  }
};