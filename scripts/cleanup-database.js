// Script to cleanup database
// Run with: node scripts/cleanup-database.js

async function cleanupDatabase() {
  console.log('🧹 Starting database cleanup...');
  
  const baseUrl = 'https://omnia-holiday-tracker.netlify.app';
  
  const actions = [
    'remove-duplicates',
    'remove-mock-holidays', 
    'remove-mock-users',
    'remove-mock-departments'
  ];
  
  for (const action of actions) {
    console.log(`\n📌 Running: ${action}`);
    
    try {
      const response = await fetch(`${baseUrl}/.netlify/functions/cleanup-database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          adminPassword: 'admin123'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ ${action} completed:`, result.results);
      } else {
        console.log(`❌ ${action} failed:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Error running ${action}:`, error.message);
    }
  }
  
  console.log('\n✨ Database cleanup complete!');
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('This script requires Node.js 18+ for native fetch support');
  console.log('Run with: node scripts/cleanup-database.js');
  process.exit(1);
}

cleanupDatabase();