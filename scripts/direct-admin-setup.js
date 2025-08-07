// Script diretto per creare account admin utilizzando il database
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function setupAdminDirectly() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Connessione al database...');
    await client.connect();
    console.log('✅ Connesso al database Neon');

    // Hash della password "admin123"
    const passwordHash = await bcrypt.hash('admin123', 12);
    console.log('🔑 Password hashata');

    // SQL per inserire l'admin
    const insertQuery = `
      INSERT INTO users (email, name, password_hash, role, status, holiday_allowance)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, name, role, status, created_at;
    `;

    const values = [
      'max.giurastante@ominiaservices.net',
      'Massimiliano Giurastante',
      passwordHash,
      'admin',
      'active',
      25
    ];

    console.log('📝 Eseguendo inserimento admin...');
    const result = await client.query(insertQuery, values);
    
    const admin = result.rows[0];
    
    console.log('\n✅ Account admin creato con successo!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Password: admin123');
    console.log('👤 Nome:', admin.name);
    console.log('🆔 ID:', admin.id);
    console.log('📅 Creato:', admin.created_at);
    
    console.log('\n🚀 Ora puoi fare login come admin!');
    
  } catch (error) {
    if (error.constraint && error.constraint.includes('email')) {
      console.log('\n⚠️  Account admin già esistente!');
      console.log('📧 Email: max.giurastante@ominiaservices.net');
      console.log('🔑 Password: admin123');
    } else {
      console.error('❌ Errore durante la creazione dell\'admin:', error.message);
      console.error('Dettagli:', error);
    }
  } finally {
    await client.end();
    console.log('🔌 Connessione chiusa');
  }
}

// Verifica che DATABASE_URL sia presente
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non trovato nel file .env');
  process.exit(1);
}

setupAdminDirectly();