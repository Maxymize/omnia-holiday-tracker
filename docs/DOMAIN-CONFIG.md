# 🏢 OmniaGroup Domain Configuration

## 📧 Email Domain Management

### **Allowed Domains for Registration**
The system supports multiple OmniaGroup company domains for employee registration:

- **Primary**: `omniaservices.net` (main company)
- **Secondary**: `omniaelectronics.com` (electronics division)
- **Additional**: Configurable by admin through settings panel

### **Domain Configuration**
Domains are managed through:
1. **Environment Variable**: `ALLOWED_EMAIL_DOMAINS=omniaservices.net,omniaelectronics.com`
2. **Database Settings**: Admin can add/remove domains through UI
3. **Runtime Validation**: All registration attempts validated against current domain list

### **Admin Email**
- **Primary Administrator**: `max.giurastante@omniaservices.net`
- **Full System Access**: User management, settings, approvals, domain configuration

### **Implementation Notes**
- Domain validation is case-insensitive
- Leading/trailing whitespace is automatically trimmed
- Domains are stored in `settings` table with key `allowed_domains`
- Default domains loaded from environment variables on first run
- Admin can dynamically add/remove domains without code deployment

### **Security Considerations**
- Only exact domain matches are allowed (no subdomain wildcards)
- Domain changes are logged in audit trail
- Admin confirmation required for domain modifications
- Existing users from removed domains remain active but cannot register new accounts

## 🔄 Migration Strategy
When updating from single domain to multi-domain:
1. Current `@omniaservices.net` users remain unchanged
2. Environment variable defines initial domain list
3. Admin can add additional domains as needed
4. All domain changes are tracked for compliance
