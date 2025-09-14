import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

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

    try {
      // Try to get a store
      const store = getStore('test-store');
      envInfo.hasBlobs = true;

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
            status: 'write/read/delete successful'
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