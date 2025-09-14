import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import type { Store } from '@netlify/blobs';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    console.log('🔍 Testing Netlify Blobs configuration...');

    // Log environment info
    const envInfo = {
      NETLIFY: process.env.NETLIFY,
      CONTEXT: process.env.CONTEXT,
      NETLIFY_SITE_ID: process.env.NETLIFY_SITE_ID,
      NODE_ENV: process.env.NODE_ENV,
      hasBlobs: false,
      error: null as any
    };

    let configType = 'unknown';

    try {
      // Check for environment variables
      const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
      const token = process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

      console.log('🔍 Manual config check:', {
        siteID: !!siteID,
        siteIDLength: siteID?.length,
        token: !!token,
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 10)
      });

      // Try automatic config first
      let store: Store;
      configType = 'automatic';

      try {
        store = getStore('test-store');
        envInfo.hasBlobs = true;
      } catch (autoError) {
        console.log('❌ Automatic config failed, trying manual...');

        if (!siteID || !token) {
          throw new Error(`Manual config also not possible. SiteID: ${!!siteID}, Token: ${!!token}`);
        }

        // Try manual config
        store = getStore({
          name: 'test-store',
          siteID: siteID,
          token: token
        } as any);
        envInfo.hasBlobs = true;
        configType = 'manual';
      }

      // Try to write a test value
      const testKey = `test-${Date.now()}`;
      await store.set(testKey, 'Hello from Netlify Blobs!');

      // Try to read it back
      const value = await store.get(testKey);

      // Clean up
      await store.delete(testKey);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Netlify Blobs is working correctly!',
          environment: envInfo,
          testResult: {
            key: testKey,
            value: value,
            status: 'write/read/delete successful',
            configType: configType
          }
        })
      };

    } catch (blobError) {
      envInfo.error = {
        message: blobError instanceof Error ? blobError.message : String(blobError),
        stack: blobError instanceof Error ? blobError.stack : undefined
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Netlify Blobs is not working',
          environment: envInfo,
          error: envInfo.error
        })
      };
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};