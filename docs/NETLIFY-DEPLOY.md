# 🚀 Netlify Deploy Guide for Omnia Holiday Tracker

## 📧 Email Configuration for Production

### Important: URL Configuration

Per configurare correttamente gli URL nelle email, assicurati di impostare queste variabili d'ambiente in **Netlify Dashboard → Site Settings → Environment Variables**:

### ✅ Variabili d'ambiente di produzione richieste:

```bash
# URL del sito - CRITICO per i link nelle email
SITE_URL=https://holiday.omniaelectronics.com

# Database (auto-configurato da Netlify)
DATABASE_URL=postgresql://[connection-string]

# JWT Security
JWT_SECRET=Omnia2025_HolidayTracker_JWT_Secret_v1_Production_Ready_Secure_Key_256bit

# Email Configuration
RESEND_API_KEY=re_KRzbckQY_6uTwPxMNR2M4LstEHXFaBCpJ  
FROM_EMAIL=holidays@omniaelectronics.com

# Admin Configuration
ADMIN_EMAIL=max.giurastante@omniaservices.net

# Medical Certificate Encryption
MEDICAL_CERT_ENCRYPTION_KEY=production_secure_key_for_medical_certificates_256bit
MEDICAL_CERT_RETENTION_DAYS=730

# Netlify Site Configuration
NETLIFY_SITE_ID=7f0d937b-90f7-4b50-8d79-430c0adcf588

# Domain Configuration
ALLOWED_EMAIL_DOMAINS=omniaservices.net,omniaelectronics.com
```

### ⚠️ ATTENZIONE: URL nei link delle email

- **Locale/Testing**: Le email conterranno link a `http://localhost:3000`
- **Produzione**: Le email conterranno link a `https://holiday.omniaelectronics.com`

### 🔧 Come configurare in Netlify:

1. **Vai nel Dashboard Netlify**:
   ```
   https://app.netlify.com/sites/omnia-holiday-tracker
   ```

2. **Naviga a**: Site Settings → Environment Variables

3. **Aggiungi le variabili** (una per una):
   - Nome: `SITE_URL`
   - Valore: `https://holiday.omniaelectronics.com`

4. **Ripeti per tutte le variabili** elencate sopra

5. **Redeploy** del sito per applicare le nuove variabili

### ✅ Verifica configurazione:

Dopo il deploy, le email dovrebbero contenere link che puntano a:
- ✅ `https://holiday.omniaelectronics.com/admin/employees`
- ✅ `https://holiday.omniaelectronics.com/admin/holidays`  
- ✅ `https://holiday.omniaelectronics.com/dashboard`

### 🧪 Test Email Configuration

Per testare che le email utilizzino l'URL corretto:

```bash
# Endpoint per testare il sistema email
curl -X GET https://holiday.omniaelectronics.com/.netlify/functions/test-email-system?test=true&to=max.giurastante@omniaservices.net
```

### 📝 Note sulla priorità URL:

Il sistema utilizza le variabili d'ambiente in questo ordine:
1. `process.env.SITE_URL` (priorità massima)
2. `process.env.URL` (auto-impostata da Netlify)
3. `'https://omnia-holiday-tracker.netlify.app'` (fallback)

**Importante**: Impostando `SITE_URL=https://holiday.omniaelectronics.com` in Netlify, tutti i link nelle email punteranno al dominio personalizzato.

---

## 🔗 Configurazione DNS

Assicurati che il dominio `holiday.omniaelectronics.com` punti correttamente al sito Netlify con:

- **CNAME record**: `holiday` → `omnia-holiday-tracker.netlify.app`
- Oppure **A record** agli IP di Netlify

## 🚀 Deploy Process

1. **Push to main branch** → Auto-deploy su Netlify
2. **Verifica variabili d'ambiente** → Controllo configuration
3. **Test email system** → Verifica URL corretto
4. **Controllo DNS** → Dominio personalizzato funzionante

## 📞 Support

Per problemi con la configurazione, contattare:
- **Admin**: max.giurastante@omniaservices.net  
- **Email di sistema**: holidays@omniaelectronics.com