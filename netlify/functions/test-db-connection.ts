import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Check all possible database URL environment variables
  const dbUrls = {
    DATABASE_URL: process.env.DATABASE_URL,
    NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL,
    NETLIFY_DATABASE_URL_UNPOOLED: process.env.NETLIFY_DATABASE_URL_UNPOOLED,
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED
  };

  const results: any = {};
  
  for (const [key, url] of Object.entries(dbUrls)) {
    if (!url) {
      results[key] = { exists: false };
      continue;
    }
    
    results[key] = {
      exists: true,
      length: url.length,
      startsWithPostgres: url.startsWith('postgres://'),
      startsWithPostgresql: url.startsWith('postgresql://'),
      hasChannelBinding: url.includes('channel_binding'),
      hasSslMode: url.includes('sslmode'),
      hasAt: url.includes('@'),
      hasQuestionMark: url.includes('?'),
      hasAmpersand: url.includes('&'),
      // Mask sensitive parts for logging
      maskedUrl: url.replace(/:\/\/[^@]+@/, '://***:***@').substring(0, 100) + '...'
    };
    
    // Try to parse as URL
    try {
      const parsedUrl = new URL(url.startsWith('postgres://') ? url.replace('postgres://', 'postgresql://') : url);
      results[key].canParse = true;
      results[key].protocol = parsedUrl.protocol;
      results[key].hostname = parsedUrl.hostname;
      results[key].pathname = parsedUrl.pathname;
      results[key].searchParams = Array.from(parsedUrl.searchParams.keys());
    } catch (e: any) {
      results[key].canParse = false;
      results[key].parseError = e.message;
    }
  }
  
  // Try to actually connect
  let connectionTest = { success: false, error: '' };
  try {
    // Import db only if we have a URL
    const anyUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL;
    if (anyUrl) {
      const { db } = await import('../../lib/db/index');
      // Try a simple query
      await db.execute('SELECT 1');
      connectionTest.success = true;
    } else {
      connectionTest.error = 'No database URL found';
    }
  } catch (error: any) {
    connectionTest.error = error.message || 'Unknown error';
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      urls: results,
      connectionTest
    }, null, 2)
  };
};