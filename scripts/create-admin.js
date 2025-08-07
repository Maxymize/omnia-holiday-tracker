// Script per creare un account admin di test
const bcrypt = require('bcryptjs');

async function createAdmin() {
  // Hash della password "admin123"
  const passwordHash = await bcrypt.hash('admin123', 12);
  
  console.log('Account Admin da inserire:');
  console.log('Email: max.giurastante@ominiaservice.net');
  console.log('Password: admin123');
  console.log('Password Hash:', passwordHash);
  console.log('Role: admin');
  console.log('Status: active');
  console.log('Holiday Allowance: 25');
  
  // SQL da eseguire manualmente nel database
  const sql = `
INSERT INTO users (email, name, password_hash, role, status, holiday_allowance)
VALUES (
  'max.giurastante@ominiaservice.net',
  'Massimiliano Giurastante',
  '${passwordHash}',
  'admin',
  'active',
  25
);`;
  
  console.log('\nSQL da eseguire:');
  console.log(sql);
}

createAdmin().catch(console.error);