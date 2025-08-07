// Script per testare le funzionalità backend principali
require('dotenv').config();

const BASE_URL = 'http://localhost:8888'; // Netlify dev server
const fetch = require('node-fetch');

async function testEmployeeRegistration() {
  console.log('\n🧪 Test 1: Registrazione dipendente');
  
  const registerData = {
    name: 'Marco Rossi',
    email: 'marco.rossi@ominiaservices.net',
    password: 'test123456'
  };

  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Registrazione riuscita:', result);
      return result.data?.user?.id;
    } else {
      console.log('⚠️  Errore registrazione:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Errore rete registrazione:', error.message);
    return null;
  }
}

async function testAdminLogin() {
  console.log('\n🧪 Test 2: Login admin');
  
  const loginData = {
    email: 'max.giurastante@ominiaservices.net',
    password: 'admin123'
  };

  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/login-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Login admin riuscito:', {
        user: result.data?.user,
        tokenExists: !!result.data?.accessToken
      });
      return result.data?.accessToken;
    } else {
      console.log('❌ Errore login admin:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Errore rete login admin:', error.message);
    return null;
  }
}

async function testGetEmployees(adminToken) {
  console.log('\n🧪 Test 3: Lista dipendenti (admin)');
  
  if (!adminToken) {
    console.log('⚠️  Token admin non disponibile, salto test');
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/users/get-employees`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Lista dipendenti ricevuta:', {
        totalEmployees: result.data?.employees?.length || 0,
        employees: result.data?.employees?.map(emp => ({
          name: emp.name,
          email: emp.email,
          status: emp.status,
          role: emp.role
        })) || []
      });
    } else {
      console.log('❌ Errore lista dipendenti:', result);
    }
  } catch (error) {
    console.error('❌ Errore rete lista dipendenti:', error.message);
  }
}

async function testApproveEmployee(adminToken, employeeId) {
  console.log('\n🧪 Test 4: Approvazione dipendente');
  
  if (!adminToken || !employeeId) {
    console.log('⚠️  Token admin o ID dipendente non disponibile, salto test');
    return;
  }

  const approvalData = {
    userId: employeeId,
    action: 'approve'
  };

  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/auth/admin-approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(approvalData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Approvazione dipendente riuscita:', result);
    } else {
      console.log('❌ Errore approvazione dipendente:', result);
    }
  } catch (error) {
    console.error('❌ Errore rete approvazione:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Avvio test backend per Omnia Holiday Tracker');
  console.log('📡 URL Base:', BASE_URL);
  
  // Test 1: Registrazione dipendente
  const employeeId = await testEmployeeRegistration();
  
  // Test 2: Login admin
  const adminToken = await testAdminLogin();
  
  // Test 3: Lista dipendenti
  await testGetEmployees(adminToken);
  
  // Test 4: Approvazione dipendente (se registrazione è riuscita)
  if (employeeId && adminToken) {
    await testApproveEmployee(adminToken, employeeId);
    
    // Test 5: Lista dipendenti dopo approvazione
    console.log('\n🧪 Test 5: Lista dipendenti dopo approvazione');
    await testGetEmployees(adminToken);
  }
  
  console.log('\n🏁 Test completati!');
  console.log('\n📋 Prossimi passi:');
  console.log('1. Verificare che tutti i test siano passati');
  console.log('2. Testare login del dipendente approvato');
  console.log('3. Procedere con Fase 3: Frontend Development');
}

// Avvia i test
runAllTests().catch(console.error);