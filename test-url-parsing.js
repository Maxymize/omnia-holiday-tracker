// Test URL parsing with different formats

const testUrls = [
  'postgresql://user:pass@host.com:5432/dbname?sslmode=require&channel_binding=require',
  'postgres://user:pass@host.com:5432/dbname?sslmode=require&channel_binding=require',
  'postgresql://user:pass@host.com:5432/dbname&sslmode=require&channel_binding=require',
  'postgresql://user:pass@host.com:5432/dbname?channel_binding=require&sslmode=require',
];

console.log('Testing URL parsing and cleaning:\n');

testUrls.forEach((originalUrl, index) => {
  console.log(`Test ${index + 1}: ${originalUrl.substring(0, 50)}...`);
  
  let url = originalUrl;
  
  // Convert postgres:// to postgresql://
  if (url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
    url = url.replace('postgres://', 'postgresql://');
    console.log('  → Converted to postgresql://');
  }
  
  try {
    const parsedUrl = new URL(url);
    console.log('  ✓ Successfully parsed as URL');
    console.log(`    Protocol: ${parsedUrl.protocol}`);
    console.log(`    Host: ${parsedUrl.host}`);
    console.log(`    Pathname: ${parsedUrl.pathname}`);
    console.log(`    Search params: ${Array.from(parsedUrl.searchParams.keys()).join(', ')}`);
    
    // Remove channel_binding
    if (parsedUrl.searchParams.has('channel_binding')) {
      parsedUrl.searchParams.delete('channel_binding');
      console.log('  → Removed channel_binding parameter');
    }
    
    // Ensure sslmode
    if (!parsedUrl.searchParams.has('sslmode')) {
      parsedUrl.searchParams.set('sslmode', 'require');
      console.log('  → Added sslmode=require');
    }
    
    const cleanUrl = parsedUrl.toString();
    console.log(`  Final URL: ${cleanUrl.substring(0, 50)}...`);
    
  } catch (error) {
    console.log(`  ✗ Failed to parse: ${error.message}`);
    
    // Try fallback cleaning
    console.log('  → Attempting fallback string replacement...');
    url = url
      .replace(/[?&]channel_binding=require/g, '')
      .replace(/&&/g, '&')
      .replace(/[?]&/g, '?');
    
    if (!url.includes('sslmode=')) {
      url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
    }
    
    console.log(`  Fallback result: ${url.substring(0, 50)}...`);
  }
  
  console.log('');
});