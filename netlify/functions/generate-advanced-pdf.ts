import { Handler } from '@netlify/functions';
import { generateAdvancedPDFReport } from '../../lib/export/advanced-pdf-generator';
import { ReportData, PDFExportOptions } from '../../lib/export/types';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: Handler = async (event, context) => {
  console.log('🚀🚀🚀 NETLIFY FUNCTION: generate-advanced-pdf STARTED 🚀🚀🚀');
  console.log('🚀🚀🚀 HTTP METHOD:', event.httpMethod, '🚀🚀🚀');
  console.log('🚀🚀🚀 HEADERS:', JSON.stringify(event.headers, null, 2), '🚀🚀🚀');
  console.log('🚀🚀🚀 BODY LENGTH:', event.body?.length || 0, 'chars 🚀🚀🚀');

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    console.log('🚀🚀🚀 HANDLING OPTIONS REQUEST 🚀🚀🚀');
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    console.log('❌❌❌ METHOD NOT ALLOWED:', event.httpMethod, '❌❌❌');
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('🔍🔍🔍 PARSING REQUEST BODY... 🔍🔍🔍');
    const { data, options }: { data: ReportData; options: PDFExportOptions } = JSON.parse(event.body || '{}');
    console.log('✅✅✅ REQUEST BODY PARSED SUCCESSFULLY ✅✅✅');
    console.log('✅✅✅ DATA PROVIDED:', !!data, '✅✅✅');
    console.log('✅✅✅ OPTIONS PROVIDED:', !!options, '✅✅✅');

    if (!data || !options) {
      console.log('❌❌❌ MISSING DATA OR OPTIONS ❌❌❌');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing data or options' })
      };
    }

    console.log('🔧🔧🔧 REQUEST DETAILS 🔧🔧🔧');
    console.log('🔧🔧🔧 REQUESTS COUNT:', data.requests?.length || 0, '🔧🔧🔧');
    console.log('🔧🔧🔧 INCLUDE CHARTS:', options.includeCharts, '🔧🔧🔧');
    console.log('🔧🔧🔧 PERIOD TYPE:', data.period?.type, '🔧🔧🔧');

    console.log('📊📊📊 GENERATING ADVANCED PDF WITH CHARTS... 📊📊📊');

    // Generate the advanced PDF with charts
    let pdfBuffer;
    try {
      pdfBuffer = await generateAdvancedPDFReport(data, options);
      console.log('✅✅✅ PDF BUFFER GENERATED - SIZE:', pdfBuffer.length, 'bytes ✅✅✅');
    } catch (pdfError) {
      console.error('❌❌❌ PDF GENERATION FAILED:', pdfError, '❌❌❌');
      throw pdfError;
    }

    // Convert to base64 for transmission
    console.log('🔄🔄🔄 CONVERTING TO BASE64... 🔄🔄🔄');
    const base64PDF = Buffer.from(pdfBuffer).toString('base64');
    console.log('✅✅✅ BASE64 CONVERSION COMPLETE - LENGTH:', base64PDF.length, 'chars ✅✅✅');

    const response = {
      success: true,
      pdf: base64PDF,
      filename: `advanced-holiday-report-${new Date().toISOString().split('T')[0]}.pdf`
    };

    console.log('🎉🎉🎉 SUCCESS! RETURNING RESPONSE 🎉🎉🎉');
    console.log('🎉🎉🎉 RESPONSE KEYS:', Object.keys(response), '🎉🎉🎉');

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('🚨🚨🚨 NETLIFY FUNCTION ERROR 🚨🚨🚨');
    console.error('🚨🚨🚨 ERROR TYPE:', typeof error, '🚨🚨🚨');
    console.error('🚨🚨🚨 ERROR MESSAGE:', error instanceof Error ? error.message : 'Unknown error', '🚨🚨🚨');
    console.error('🚨🚨🚨 ERROR STACK:', error instanceof Error ? error.stack : 'No stack', '🚨🚨🚨');
    console.error('🚨🚨🚨 FULL ERROR:', error, '🚨🚨🚨');

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate advanced PDF report',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};