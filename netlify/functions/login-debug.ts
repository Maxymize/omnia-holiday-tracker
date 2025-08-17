import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    method: event.httpMethod,
    path: event.path,
    stage: 'initial'
  };

  try {
    // Stage 1: Check environment
    debugInfo.stage = 'environment';
    debugInfo.hasAdminEmail = !!process.env.ADMIN_EMAIL;
    debugInfo.hasJwtSecret = !!process.env.JWT_SECRET;
    debugInfo.hasDatabaseUrl = !!(process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
    
    // Stage 2: Parse body
    debugInfo.stage = 'parse_body';
    const body = JSON.parse(event.body || '{}');
    debugInfo.hasEmail = !!body.email;
    debugInfo.hasPassword = !!body.password;
    debugInfo.emailProvided = body.email;
    
    // Stage 3: Try to import database modules
    debugInfo.stage = 'import_modules';
    try {
      const { getUserByEmail } = await import('../../lib/db/operations');
      debugInfo.dbOperationsImported = true;
      
      const { isDatabaseInitialized } = await import('../../lib/db/auto-init');
      debugInfo.autoInitImported = true;
    } catch (importError: any) {
      debugInfo.importError = importError.message;
      debugInfo.importStack = importError.stack?.split('\n').slice(0, 5);
    }
    
    // Stage 4: Try to check database
    if (debugInfo.dbOperationsImported) {
      debugInfo.stage = 'database_check';
      try {
        const { isDatabaseInitialized } = await import('../../lib/db/auto-init');
        const isInit = await isDatabaseInitialized();
        debugInfo.databaseInitialized = isInit;
      } catch (dbCheckError: any) {
        debugInfo.dbCheckError = dbCheckError.message;
        debugInfo.dbCheckStack = dbCheckError.stack?.split('\n').slice(0, 5);
      }
    }
    
    // Stage 5: Try to query user
    if (debugInfo.dbOperationsImported && body.email) {
      debugInfo.stage = 'user_query';
      try {
        const { getUserByEmail } = await import('../../lib/db/operations');
        const user = await getUserByEmail(body.email.toLowerCase());
        debugInfo.userFound = !!user;
        if (user) {
          debugInfo.userStatus = user.status;
          debugInfo.userRole = user.role;
        }
      } catch (queryError: any) {
        debugInfo.queryError = queryError.message;
        debugInfo.queryStack = queryError.stack?.split('\n').slice(0, 5);
      }
    }
    
    debugInfo.stage = 'complete';
    debugInfo.success = true;
    
  } catch (error: any) {
    debugInfo.stage = 'error';
    debugInfo.error = error.message;
    debugInfo.errorStack = error.stack?.split('\n').slice(0, 10);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(debugInfo, null, 2)
  };
};