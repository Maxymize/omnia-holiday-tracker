// IMPORTANTE: Carica le variabili d'ambiente PRIMA di importare il database
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// Verifica che DATABASE_URL sia caricato
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non trovato nel file .env');
  process.exit(1);
}

console.log('✅ DATABASE_URL caricato correttamente');

import { db } from '../lib/db/index';
import { users } from '../lib/db/schema';
import bcrypt from 'bcryptjs';

async function setupAdmin() {
  try {
    console.log('🔧 Creando account admin...');
    
    // Hash della password "admin123"
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    // Inserisci admin
    const admin = await db.insert(users).values({
      email: 'max.giurastante@ominiaservices.net',
      name: 'Massimiliano Giurastante',
      passwordHash: passwordHash,
      role: 'admin',
      status: 'active',
      holidayAllowance: 25
    }).returning();
    
    console.log('✅ Account admin creato con successo!');
    console.log('📧 Email: max.giurastante@ominiaservices.net');
    console.log('🔑 Password: admin123');
    console.log('👤 Nome:', admin[0].name);
    console.log('🆔 ID:', admin[0].id);
    console.log('📅 Creato:', admin[0].createdAt);
    
    console.log('\n🚀 Ora puoi fare login come admin!');
    
  } catch (error: any) {
    if (error.message?.includes('duplicate key')) {
      console.log('⚠️  Account admin già esistente!');
      console.log('📧 Email: max.giurastante@ominiaservices.net');
      console.log('🔑 Password: admin123');
    } else {
      console.error('❌ Errore durante la creazione dell\'admin:', error);
    }
  }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
  setupAdmin();
}