/**
 * Initialize Email Settings for OMNIA HOLIDAY TRACKER
 * Sets up default email configuration in the database
 */

import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

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
    console.log('🔧 Initializing email settings for Holiday Tracker...');
    
    const sql = neon(process.env.DATABASE_URL!);
    
    // Create default email settings for holiday tracker
    const defaultSettings = [
      // Core notification settings
      ['employee_registration_notifications', 'true', true, 'Send notifications when new employees register'],
      ['holiday_request_notifications', 'true', true, 'Send notifications when employees submit holiday requests'], 
      ['holiday_approval_notifications', 'true', true, 'Send notifications when holidays are approved'],
      ['holiday_rejection_notifications', 'true', true, 'Send notifications when holidays are rejected'],
      ['holiday_reminder_notifications', 'true', true, 'Send reminder notifications for upcoming holidays'],
      
      // Admin and recipient settings
      ['admin_email', 'max.giurastante@omniaservices.net', true, 'Primary admin email for notifications'],
      ['from_email', 'holidays@omniaservices.net', true, 'From email address for outgoing notifications'],
      
      // Email service settings
      ['email_service_enabled', 'true', true, 'Master switch for all email notifications'],
      ['email_queue_processing', 'true', true, 'Enable email queue processing'],
      
      // Holiday-specific settings
      ['employee_welcome_emails', 'true', true, 'Send welcome emails when employees are approved'],
      ['holiday_start_reminders', 'true', true, 'Send reminders when employee holidays are starting'],
      ['department_notifications', 'true', true, 'Send notifications to department managers']
    ];
    
    let insertedCount = 0;
    let existingCount = 0;
    
    for (const [settingName, settingValue, isEnabled, description] of defaultSettings) {
      try {
        // Try to insert, ignore if already exists
        const result = await sql`
          INSERT INTO email_settings (setting_name, setting_value, is_enabled, created_at, updated_at)
          VALUES (${settingName}, ${settingValue}, ${isEnabled}, NOW(), NOW())
          ON CONFLICT (setting_name) DO NOTHING
          RETURNING id
        `;
        
        if (result.length > 0) {
          insertedCount++;
          console.log(`✅ Created setting: ${settingName} = ${settingValue} (${isEnabled ? 'enabled' : 'disabled'})`);
        } else {
          existingCount++;
          console.log(`ℹ️  Setting already exists: ${settingName}`);
        }
      } catch (settingError) {
        console.error(`❌ Failed to create setting ${settingName}:`, settingError);
      }
    }
    
    // Get current settings to show status
    const allSettings = await sql`
      SELECT setting_name, setting_value, is_enabled, created_at, updated_at
      FROM email_settings 
      ORDER BY setting_name
    `;
    
    console.log('\n📊 Email Settings Summary:');
    console.log(`✅ New settings created: ${insertedCount}`);
    console.log(`ℹ️  Existing settings: ${existingCount}`);
    console.log(`📧 Total email settings: ${allSettings.length}`);
    
    // Test database connection and table structure
    console.log('\n🔍 Verifying email system database structure...');
    
    // Check email_settings table
    const emailSettingsTable = await sql`
      SELECT COUNT(*) as count FROM email_settings
    `;
    console.log(`📋 Email settings table: ${emailSettingsTable[0].count} records`);
    
    // Check email_queue table
    const emailQueueTable = await sql`
      SELECT COUNT(*) as count FROM email_queue
    `;
    console.log(`📬 Email queue table: ${emailQueueTable[0].count} records`);
    
    // Test queue insertion
    try {
      await sql`
        INSERT INTO email_queue (recipient_email, subject, content, template_name, status, created_at)
        VALUES (
          'test@omniaservices.net',
          'Email System Test - Initialization',
          '<p>This is a test email created during email system initialization. If you received this, the email queue is working correctly.</p>',
          'system_test',
          'pending',
          NOW()
        )
      `;
      console.log('✅ Email queue test insertion successful');
    } catch (queueError) {
      console.error('❌ Email queue test insertion failed:', queueError);
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Email settings initialized successfully',
        summary: {
          newSettings: insertedCount,
          existingSettings: existingCount,
          totalSettings: allSettings.length,
          emailQueueRecords: emailQueueTable[0].count
        },
        settings: allSettings.map(setting => ({
          name: setting.setting_name,
          value: setting.setting_value,
          enabled: setting.is_enabled,
          lastUpdated: setting.updated_at
        })),
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error: any) {
    console.error('❌ Email settings initialization error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to initialize email settings',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};