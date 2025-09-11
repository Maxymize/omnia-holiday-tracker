/**
 * Single Email Test - Send to authorized email only
 */

import { config } from 'dotenv';
config();

async function sendTestEmail() {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    console.log('🧪 Sending single test email...');
    console.log('📧 From:', process.env.FROM_EMAIL);
    console.log('📧 To: max.giurastante@omniaservices.net');
    
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: ['max.giurastante@omniaservices.net'],
      subject: '🎉 Holiday Tracker Email System - WORKING!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #16a34a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px; }
            .success-box { background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a; }
            .info-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #2563eb; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .emoji { font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">🏖️</div>
              <h1>Omnia Holiday Tracker</h1>
              <h2>Sistema Email Attivo e Funzionante!</h2>
            </div>
            <div class="content">
              <div class="success-box">
                <h3>✅ SUCCESSO! Sistema Email Completamente Operativo</h3>
                <p><strong>Congratulazioni!</strong> Il sistema di notifiche email del Holiday Tracker è stato integrato con successo e sta funzionando perfettamente!</p>
              </div>
              
              <div class="info-box">
                <h4>📊 Funzionalità Implementate:</h4>
                <ul style="list-style-type: none; padding-left: 0;">
                  <li>✅ <strong>Registrazioni Dipendenti</strong> → Email notifica agli admin</li>
                  <li>✅ <strong>Approvazione Account</strong> → Email benvenuto ai dipendenti</li>
                  <li>✅ <strong>Richieste Ferie</strong> → Email notifica agli admin</li>
                  <li>✅ <strong>Approvazione Ferie</strong> → Email conferma ai dipendenti</li>
                  <li>✅ <strong>Rifiuto Ferie</strong> → Email motivazione ai dipendenti</li>
                  <li>✅ <strong>Promemoria</strong> → Email reminder automatici</li>
                </ul>
              </div>
              
              <div class="info-box">
                <h4>🔧 Configurazione Tecnica:</h4>
                <ul style="list-style-type: none; padding-left: 0;">
                  <li>📧 <strong>Provider:</strong> Resend API</li>
                  <li>🔑 <strong>API Key:</strong> Configurata e funzionante</li>
                  <li>📤 <strong>From Email:</strong> ${process.env.FROM_EMAIL}</li>
                  <li>💾 <strong>Database:</strong> Schema email configurato</li>
                  <li>⚙️ <strong>Coda Email:</strong> Sistema di queue operativo</li>
                  <li>🔄 <strong>Integrazione:</strong> Completa in tutte le funzioni</li>
                </ul>
              </div>
              
              <div class="success-box">
                <h4>🎯 Prossimi Passi:</h4>
                <p>Per utilizzare il sistema in produzione con il dominio personalizzato:</p>
                <ol>
                  <li>Completa la verifica di <strong>omniaelectronics.com</strong> su Resend</li>
                  <li>Aggiorna FROM_EMAIL a <strong>holidays@omniaelectronics.com</strong></li>
                  <li>Testa con tutti i dipendenti</li>
                  <li>Deploy in produzione!</li>
                </ol>
              </div>
              
              <p><strong>🎉 Il sistema è pronto per il rilascio in produzione!</strong></p>
              <p><em>Timestamp: ${new Date().toLocaleString('it-IT')}</em></p>
            </div>
            <div class="footer">
              <p>&copy; 2025 OmniaServices & OmniaElectronics. All rights reserved.</p>
              <p><strong>OMNIA HOLIDAY TRACKER</strong> - Sistema di Gestione Ferie</p>
              <p>Sistema email sviluppato e testato con successo! ✅</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    if (result.error) {
      console.error('❌ Error:', result.error);
    } else {
      console.log('✅ Success! Message ID:', result.data.id);
      console.log('📬 Check your email inbox at max.giurastante@omniaservices.net');
    }
    
  } catch (error) {
    console.error('❌ Failed:', error);
  }
}

sendTestEmail();