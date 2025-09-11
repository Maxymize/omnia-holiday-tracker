import { Handler } from '@netlify/functions';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { createUser, getUserByEmail } from '../../lib/db/helpers';
import { db } from '../../lib/db/index';
import { settings } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';

// Input validation schema
const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve avere almeno 2 caratteri').max(100),
  email: z.string().email('Email non valida').toLowerCase(),
  password: z.string().min(8, 'Password deve avere almeno 8 caratteri'),
  preferredLanguage: z.enum(['it', 'en', 'es']).default('it'),
});

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Helper function to check if domain restriction is enabled
async function isDomainRestrictionEnabled(): Promise<boolean> {
  try {
    const domainSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'system.domain_restriction_enabled'))
      .limit(1);
    
    if (domainSetting.length === 0) {
      return true; // Default to enabled if setting doesn't exist
    }
    
    return domainSetting[0].value === 'true';
  } catch (error) {
    console.warn('Failed to check domain restriction setting:', error);
    return true; // Default to enabled on error for security
  }
}

// Helper function to get default holiday allowance from system settings
async function getDefaultHolidayAllowance(): Promise<number> {
  try {
    const allowanceSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'system.default_holiday_allowance'))
      .limit(1);
    
    if (allowanceSetting.length === 0) {
      return 25; // Default Italian standard if setting doesn't exist
    }
    
    const allowance = parseInt(allowanceSetting[0].value);
    return isNaN(allowance) ? 25 : allowance;
  } catch (error) {
    console.warn('Failed to get default holiday allowance setting:', error);
    return 25; // Default to Italian standard on error
  }
}

export const handler: Handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Metodo non consentito' })
    };
  }

  try {
    // Parse and validate input
    const body = JSON.parse(event.body || '{}');
    const validatedData = registerSchema.parse(body);

    // Check if domain restriction is enabled
    const isDomainRestricted = await isDomainRestrictionEnabled();
    
    if (isDomainRestricted) {
      // Validate email domain against OmniaGroup domains
      const allowedDomains = [
        'omniaservices.net', 
        'omniaelectronics.com',
        'ominiaservice.net' // Legacy domain for backward compatibility
      ];
      const emailDomain = validatedData.email.split('@')[1];
      
      if (!allowedDomains.includes(emailDomain)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Email non valida. Usa la tua email aziendale (@omniaservices.net o @omniaelectronics.com)' 
          })
        };
      }
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(validatedData.email);
    if (existingUser) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Utente già registrato con questa email' })
      };
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

    // Get default holiday allowance from system settings
    const defaultHolidayAllowance = await getDefaultHolidayAllowance();

    // Create user with pending status
    console.log('Creating user with data:', {
      name: validatedData.name,
      email: validatedData.email,
      role: 'employee',
      status: 'pending',
      holidayAllowance: defaultHolidayAllowance,
      preferredLanguage: validatedData.preferredLanguage
    });
    
    const newUser = await createUser({
      name: validatedData.name,
      email: validatedData.email,
      passwordHash,
      role: 'employee',
      status: 'pending', // Requires admin approval
      holidayAllowance: defaultHolidayAllowance, // From system settings (default 25)
      preferredLanguage: validatedData.preferredLanguage,
    });
    
    console.log('User created successfully:', { id: newUser.id, email: newUser.email, status: newUser.status });

    // Log registration for audit trail
    console.log(`New user registration: ${validatedData.email} at ${new Date().toISOString()}`);

    // Send email notification to admin (don't block registration if email fails)
    try {
      const baseUrl = process.env.SITE_URL || process.env.URL || 'https://omnia-holiday-tracker.netlify.app';
      
      const emailNotificationData = {
        action: 'employee_registration',
        userData: {
          name: newUser.name,
          email: newUser.email,
          department: null, // New users don't have departments yet
          jobTitle: null,
          phone: null,
          holidayAllowance: defaultHolidayAllowance
        }
      };

      console.log('Sending email notification for new employee registration...');
      
      const emailResponse = await fetch(`${baseUrl}/.netlify/functions/email-notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailNotificationData)
      });

      if (emailResponse.ok) {
        console.log('✅ Registration email notification sent successfully');
      } else {
        const emailError = await emailResponse.text();
        console.error('⚠️ Failed to send registration email notification:', emailError);
      }
    } catch (emailError) {
      console.error('⚠️ Email notification error (continuing with registration):', emailError);
    }

    // Return success response (don't expose user details)
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Registrazione completata! Attendi l\'approvazione dell\'amministratore.',
        requiresApproval: true
      })
    };

  } catch (error) {
    console.error('Registration error:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Dati non validi', 
          details: error.issues?.map(e => e.message) || [error.message]
        })
      };
    }

    // Handle database errors
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Email già in uso' })
      };
    }

    // Generic error response
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Errore interno del server' })
    };
  }
};