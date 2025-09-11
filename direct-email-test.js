/**
 * Direct Email Test for All Registered Users
 * Sends test emails directly using Resend API
 */

import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables
config();

async function sendEmailViaResend(to, subject, htmlContent) {
  try {
    console.log('🔧 Initializing Resend for:', to);
    
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Dynamic import to ensure fresh module loading
    const { Resend } = await import('resend');
    console.log('✅ Resend module imported successfully');
    
    const resendClient = new Resend(process.env.RESEND_API_KEY);
    
    const FROM_EMAIL = process.env.FROM_EMAIL || 'holidays@omniaservices.net';

    const emailData = {
      from: FROM_EMAIL,
      to: [to],
      subject: subject,
      html: htmlContent
    };

    console.log('📧 Sending email via Resend API to:', to);

    const result = await resendClient.emails.send(emailData);
    
    console.log('✅ Resend API success for', to, ':', result);

    if (result.error) {
      throw new Error(`Resend API error: ${result.error.message}`);
    }

    return {
      success: true,
      messageId: result.data?.id,
      response: result.data
    };
  } catch (error) {
    console.error('❌ Detailed Resend error for', to, ':', error);
    return { 
      success: false, 
      error: `Resend API error: ${error.message || 'Unknown error'}`
    };
  }
}

async function testEmailWithRealUsers() {
  try {
    console.log('🧪 Starting email test with real registered users...');
    console.log('📧 Using Resend API Key:', process.env.RESEND_API_KEY ? 'SET (' + process.env.RESEND_API_KEY.length + ' chars)' : 'NOT SET');
    console.log('📧 From Email:', process.env.FROM_EMAIL);
    console.log('💾 Database URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Get all registered users
    console.log('📋 Fetching registered users from database...');
    const users = await sql`
      SELECT id, name, email, role, status, created_at, holiday_allowance, job_title, phone
      FROM users 
      WHERE status IN ('active', 'pending')
      ORDER BY role DESC, created_at ASC
    `;
    
    console.log(`Found ${users.length} registered users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role} - ${user.status}`);
    });
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log('\n📧 Sending test emails to each user...');
    
    const results = [];
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`\n${i + 1}/${users.length} Testing email for: ${user.name} (${user.email})`);
      
      try {
        const subject = `🏖️ Test Email - Omnia Holiday Tracker - ${user.name}`;
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 30px 20px; background: #f8f9fa; border-radius: 0 0 8px 8px; }
              .info-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2563eb; }
              .success-box { background: #d1fae5; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #10b981; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              ul { list-style: none; padding: 0; }
              li { margin: 8px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏖️ Omnia Holiday Tracker - Test Email</h1>
              </div>
              <div class="content">
                <div class="success-box">
                  <h3>✅ Sistema Email Attivo!</h3>
                  <p>Ciao <strong>${user.name}</strong>, questo è un test del sistema di notifiche email del Holiday Tracker!</p>
                </div>
                
                <div class="info-box">
                  <h4>📋 I tuoi dati registrati:</h4>
                  <ul>
                    <li><strong>👤 Nome:</strong> ${user.name}</li>
                    <li><strong>📧 Email:</strong> ${user.email}</li>
                    <li><strong>🔰 Ruolo:</strong> ${user.role === 'admin' ? 'Amministratore' : 'Dipendente'}</li>
                    <li><strong>📊 Status:</strong> ${user.status === 'active' ? 'Attivo' : 'In attesa di approvazione'}</li>
                    <li><strong>🏖️ Giorni ferie annuali:</strong> ${user.holiday_allowance || 25}</li>
                    <li><strong>💼 Posizione:</strong> ${user.job_title || 'Non specificata'}</li>
                    <li><strong>📱 Telefono:</strong> ${user.phone || 'Non fornito'}</li>
                    <li><strong>📅 Registrato il:</strong> ${new Date(user.created_at).toLocaleDateString('it-IT')}</li>
                  </ul>
                </div>
                
                <h3>🎯 Funzionalità Email Attive:</h3>
                <ul style="list-style-type: disc; padding-left: 20px;">
                  <li>✅ Notifiche nuove richieste ferie</li>
                  <li>✅ Conferme approvazioni/rifiuti</li>
                  <li>✅ Notifiche registrazioni dipendenti</li>
                  <li>✅ Email di benvenuto</li>
                  <li>✅ Promemoria automatici</li>
                </ul>
                
                <p><strong>Se hai ricevuto questa email, il sistema funziona perfettamente! 🎉</strong></p>
                
                <p><em>Timestamp: ${new Date().toLocaleString('it-IT')}</em></p>
                <p><em>Inviato da: Omnia Holiday Tracker Email System</em></p>
              </div>
              <div class="footer">
                <p>&copy; 2025 OmniaServices. All rights reserved.</p>
                <p>Test email dal sistema OMNIA HOLIDAY TRACKER</p>
                <p>Questa è un'email di test per verificare il funzionamento del sistema di notifiche.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        console.log('   📤 Sending email via Resend...');
        const emailResult = await sendEmailViaResend(user.email, subject, htmlContent);
        
        if (emailResult.success) {
          console.log(`   ✅ Email sent successfully to ${user.email} (Message ID: ${emailResult.messageId})`);
          results.push({
            user: user.name,
            email: user.email,
            role: user.role,
            status: 'success',
            messageId: emailResult.messageId
          });
        } else {
          console.log(`   ❌ Email failed for ${user.email}:`, emailResult.error);
          results.push({
            user: user.name,
            email: user.email,
            role: user.role,
            status: 'failed',
            error: emailResult.error
          });
        }
        
        // Wait a bit between emails to avoid rate limiting
        if (i < users.length - 1) {
          console.log('   ⏳ Waiting 3 seconds...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (emailError) {
        console.log(`   ❌ Error sending email to ${user.email}:`, emailError.message);
        results.push({
          user: user.name,
          email: user.email,
          role: user.role,
          status: 'error',
          error: emailError.message
        });
      }
    }
    
    // Summary
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status !== 'success').length;
    
    console.log('\n📊 Email Test Results Summary:');
    console.log('=' .repeat(50));
    console.log(`✅ Successfully sent: ${successful}/${users.length} emails`);
    console.log(`❌ Failed: ${failed}/${users.length} emails`);
    console.log(`📧 Success rate: ${Math.round((successful/users.length) * 100)}%`);
    
    console.log('\n📋 Detailed Results:');
    results.forEach((result) => {
      const icon = result.status === 'success' ? '✅' : '❌';
      const details = result.status === 'success' 
        ? `Message ID: ${result.messageId || 'N/A'}`
        : `Error: ${result.error}`;
      
      console.log(`${icon} ${result.user} (${result.email}) - ${result.role} - ${details}`);
    });
    
    if (successful > 0) {
      console.log('\n🎉 Email system is working! Check your inbox(es) for test emails.');
      console.log('📬 Emails should arrive within 1-2 minutes.');
      console.log('📧 Look for emails from:', process.env.FROM_EMAIL || 'holidays@omniaservices.net');
    } else {
      console.log('\n⚠️  No emails were sent successfully. Check configuration and logs.');
    }
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

// Run the test
testEmailWithRealUsers();