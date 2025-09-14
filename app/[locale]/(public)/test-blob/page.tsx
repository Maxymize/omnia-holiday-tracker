'use client';

import { useState } from 'react';

export default function TestBlobPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState<string>('');

  const testBlobUpload = async () => {
    setLoading(true);
    setResult(null);
    setTestType('blob');
    
    try {
      const baseUrl = 'https://holiday.omniaelectronics.com';
      
      console.log('🧪 Testing blob upload functionality...');
      
      const response = await fetch(`${baseUrl}/.netlify/functions/test-blob-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // No authentication needed for this test
        body: JSON.stringify({ test: true })
      });

      const data = await response.json();
      
      console.log('Blob test response:', data);
      setResult({
        status: response.status,
        success: response.ok,
        data: data
      });
      
    } catch (error: any) {
      console.error('Blob test error:', error);
      setResult({
        status: 'error',
        success: false,
        data: { error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  const testAuthentication = async () => {
    setLoading(true);
    setResult(null);
    setTestType('auth');
    
    try {
      const baseUrl = 'https://holiday.omniaelectronics.com';
      
      console.log('🔍 Testing authentication functionality...');
      console.log('🍪 Current cookies:', document.cookie || 'none');
      
      const response = await fetch(`${baseUrl}/.netlify/functions/test-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // Include credentials to send cookies
        credentials: 'include',
        body: JSON.stringify({ test: true })
      });

      const data = await response.json();
      
      console.log('Auth test response:', data);
      setResult({
        status: response.status,
        success: response.ok,
        data: data
      });
      
    } catch (error: any) {
      console.error('Auth test error:', error);
      setResult({
        status: 'error',
        success: false,
        data: { error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Netlify Blobs Upload</h1>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={testBlobUpload}
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading && testType === 'blob' ? 'Testing Blobs...' : 'Test Blob Upload'}
          </button>
          
          <button
            onClick={testAuthentication}
            disabled={loading}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading && testType === 'auth' ? 'Testing Auth...' : 'Test Authentication'}
          </button>
        </div>

        {result && (
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-bold mb-2">
              Test Result ({testType === 'blob' ? 'Netlify Blobs' : 'Authentication'}):
            </h3>
            <div className={`mb-2 font-semibold ${result.success ? 'text-green-600' : 'text-red-600'}`}>
              Status: {result.status} - {result.success ? 'SUCCESS' : 'FAILED'}
            </div>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-sm text-gray-600 space-y-2">
        <p><strong>Test Blob Upload:</strong> Testa la funzionalità di Netlify Blobs senza autenticazione.</p>
        <p><strong>Test Authentication:</strong> Testa se i cookie vengono inviati correttamente alle funzioni.</p>
        <p>Se Blobs funziona ma Authentication fallisce, il problema è nei cookie/autenticazione.</p>
        <p>Assicurati di essere loggato prima di testare l&apos;autenticazione.</p>
      </div>
    </div>
  );
}