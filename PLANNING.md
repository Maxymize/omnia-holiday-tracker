# Omnia Holiday Tracker - Project Planning

## 🤖 Development Tools & AI Agents

### **Specialized AI Agents (MUST USE)**
Claude Code has access to specialized agents that MUST be actively utilized:

- **backend-api-specialist**: Expert in server-side development
  - Use for: Netlify Functions implementation, API design, server logic
  - Critical for: Authentication systems, database operations, business logic

- **frontend-react-specialist**: Expert in modern React development  
  - Use for: Component architecture, Next.js 15 features, UI implementation
  - Critical for: Calendar components, responsive design, state management

- **database-specialist**: Expert in database design and optimization
  - Use for: Drizzle ORM schemas, migrations, query performance
  - Critical for: Holiday tracking data model, relationship optimization

- **security-auth-specialist**: Expert in authentication and security
  - Use for: JWT implementation, role-based access, input validation
  - Critical for: OmniaGroup domain restrictions, admin controls

- **seo-engineer**: Expert in performance and accessibility
  - Use for: Core Web Vitals, accessibility compliance, meta tags
  - Critical for: Mobile optimization, search engine visibility

- **web-copywriter**: Expert in user-facing content
  - Use for: UI text, error messages, user guidance
  - Critical for: Multi-language content (IT/EN/ES), professional tone

### **MCP Research Tools**
- **context7**: Documentation and best practices research
  - Use BEFORE implementing any new library or framework
  - Essential for: Next.js 15, Drizzle ORM, React Big Calendar, Netlify specifics

**CRITICAL RULE**: Always research with context7 and delegate to specialists proactively!

## 🎯 Project Overview

**Project Name**: Omnia Holiday Tracker  
**Objective**: Internal SaaS for OmniaGroup employee holiday management and tracking  
**Business Model**: Custom internal tool - no payments, OmniaGroup employees only  
**Target Launch**: 4-6 weeks from start  

## 🏗️ Architecture & Technology Stack

### **Frontend Architecture**
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Animations**: Framer Motion for smooth interactions
- **Routing**: Internationalized routing (it/en/es)
- **State Management**: React Query + Zustand
- **Forms**: React Hook Form + Zod validation
- **Calendar**: React Big Calendar or FullCalendar for holiday visualization

### **Backend Architecture**  
- **Platform**: Netlify Functions (serverless)
- **Database**: Neon PostgreSQL
- **ORM**: Drizzle ORM with migrations
- **Authentication**: Custom JWT-based auth system
- **File Storage**: Local/minimal storage (no heavy file management needed)
- **Email Service**: Optional - browser notifications preferred
- **Payment Processing**: NOT NEEDED - internal tool only

### **Deployment & Infrastructure**
- **Hosting**: Netlify with automatic deployments
- **Domain**: Custom OmniaGroup subdomain with SSL
- **CDN**: Netlify Edge for global performance
- **Monitoring**: Built-in Netlify Analytics + custom monitoring
- **Environment**: Production, Staging, Development

⚠️ **CRITICAL DEPLOYMENT RULE**: 
**Never use `output: 'export'` in next.config.js for SaaS applications with middleware, authentication, or server features.**

**Why**: Static export is incompatible with:
- middleware.ts (language detection, auth routing)
- Server-side rendering (SSR/SSG)
- Netlify Functions integration
- Dynamic routing with authentication

**Correct Configuration**:
```javascript
// ✅ CORRECT - Regular Next.js deployment
const nextConfig = {
  trailingSlash: true,
  images: { unoptimized: false },
  serverExternalPackages: ['@neondatabase/serverless', 'bcryptjs'],
  // NO output: 'export' for SaaS apps
}
```

## 🎨 Design System & UI Guidelines

### **Color Palette (OmniaGroup Branding)**
- **Primary**: `#1e40af` (Blue 700) - OmniaGroup primary brand color
- **Primary Light**: `#3b82f6` (Blue 500) - Interactive elements
- **Secondary**: `#059669` (Emerald 600) - Success states, approved holidays
- **Accent**: `#d97706` (Amber 600) - Pending status, warnings
- **Success**: `#10b981` (Emerald 500) - Approved requests
- **Warning**: `#f59e0b` (Amber 500) - Pending approval
- **Error**: `#ef4444` (Red 500) - Rejected requests
- **Info**: `#3b82f6` (Blue 500) - Information states

### **Typography**
- **Font Family**: Inter (Google Fonts) - professional, readable
- **Headings**: Font weight 600-700
- **Body Text**: Font weight 400-500
- **Interface Elements**: Font weight 500
- **Code/Dates**: JetBrains Mono for date displays

### **Responsive Breakpoints**
```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### **Animation Principles**
- **Duration**: 150ms (fast interactions), 300ms (normal), 500ms (page transitions)
- **Easing**: ease-in-out for most transitions
- **Calendar interactions**: Smooth hover effects, date selection
- **Status changes**: Subtle animations for approval/rejection feedback

## 🔐 Security & Compliance

### **Data Protection (GDPR & Italian Labor Law)**
- **Field-level encryption** for sensitive employee data
- **Data minimization**: Only collect necessary holiday information
- **Consent management**: Clear opt-in for data processing
- **Right to deletion**: Employee can request data removal when leaving
- **Audit logging**: Track all admin actions and holiday approvals

### **Authentication & Authorization**
- **Custom JWT tokens** with proper expiration
- **Role-based access control**: employee/admin
- **Multi-domain access**: Configurable email domains for OmniaGroup and partners
- **Admin controls**: max.giurastante@omniaservices.net has super admin privileges
- **Rate limiting**: Per IP and per user
- **Session management**: Secure token refresh
- **Domain configuration**: Admin can configure allowed email domains

### **API Security**
- **CORS configuration**: Proper origin restrictions
- **Input validation**: Zod schemas on all endpoints
- **SQL injection prevention**: Parameterized queries only
- **Error handling**: No sensitive data in error responses
- **Admin verification**: Special checks for max.giurastante@ominiaservice.net

## 💰 Business Logic & Workflow

### **Employee Holiday Request Workflow**
```
Employee Registration → Admin Approval → Holiday Request → 
Manager Approval (if enabled) → Calendar Update → Notifications
```

### **User Roles & Permissions**
- **Employee**: Create holiday requests, view own holidays, view team holidays (if enabled)
- **Admin (max.giurastante@omniaservices.net)**: 
  - Approve employee registrations
  - Configure system settings (visibility, approval mode, allowed domains)
  - Manage all holiday requests
  - Create and manage departments
  - View all employee data and statistics
  - Configure allowed email domains for registration

### **System Configuration Options**
- **Visibility Mode**: 
  - "all_see_all": Everyone can see everyone's holidays
  - "admin_only": Only admins see all holidays, employees see only their own
- **Approval Mode**:
  - "manual": All requests require admin approval
  - "auto": Requests are automatically approved
- **Department Visibility**: Employees can see colleagues in same department

## 🌍 Internationalization (i18n)

### **Supported Locales**
- **Italian (it)**: Primary language for OmniaGroup Italy
- **English (en)**: For international employees and admin
- **Spanish (es)**: For Spanish-speaking employees
- **URL Structure**: `/it/dashboard`, `/en/dashboard`, `/es/dashboard`
- **Language Detection**: Browser preference → URL → localStorage

### **Translation Architecture & Best Practices**

#### **📁 File Structure**
```
src/lib/i18n/index.ts    # Main translation file with nested objects
```

#### **🏗️ Translation Object Structure**
**CRITICAL**: Always use nested hierarchical structure to avoid conflicts:

```typescript
const translations = {
  it: {
    dashboard: {                    // ✅ Section-specific nesting
      calendar: {
        addHoliday: 'Aggiungi Ferie',
        viewMonth: 'Vista Mensile',
        // ... other calendar keys
      },
      holidays: {
        requestVacation: 'Richiedi Ferie',
        pending: 'In Attesa',
        approved: 'Approvato',
        // ... other holiday keys
      }
    },
    auth: { /* auth translations */ },
    admin: { /* admin translations */ }
  },
  // Same structure for en: and es:
}
```

#### **⚠️ CRITICAL MISTAKES TO AVOID (Learned from CoupleCompatibility)**

**❌ WRONG - Duplicate Root Keys (Causes Conflicts)**
```typescript
// This creates duplicate dashboard definitions - NEVER DO THIS
it: {
  dashboard: { calendar: { /* keys */ } },  // First definition
  // ... other sections
  dashboard: { holidays: { /* keys */ } }   // DUPLICATE! Overwrites first
}
```

#### **🎯 Component Translation Usage**

**CRITICAL**: Always use consistent translation paths:

```typescript
// ✅ CORRECT - Use the nested path consistently
t('dashboard.calendar.addHoliday')
t('dashboard.holidays.requestVacation')
t('admin.employees.approveRequest')

// ❌ WRONG - Direct access (will show keys instead of translations)
t('calendar.addHoliday')
t('holidays.requestVacation')
```

### **Content Translation for Holiday Tracker**
- **UI Elements**: All buttons, calendar labels, status messages
- **Email Templates**: Optional notification emails in all languages
- **Error Messages**: User-friendly error text in all languages
- **Date Formatting**: Locale-specific date display (DD/MM/YYYY for IT, MM/DD/YYYY for EN)
- **Holiday Types**: Vacation/Ferie, Sick Leave/Malattia, Personal Day/Permesso Personale

## 📊 Performance & Monitoring

### **Performance Targets**
- **Page Load Time**: <2 seconds (calendar-heavy application)
- **API Response Time**: <300ms (95th percentile)
- **Bundle Size**: <150KB initial load (simpler than e-commerce)
- **Calendar Rendering**: <500ms for monthly views

### **Monitoring Strategy**
- **Error Tracking**: Automated error logging and alerts
- **Performance Monitoring**: Real-time metrics dashboard
- **Usage Analytics**: Employee engagement, request patterns
- **Business Metrics**: Holiday utilization, approval rates, department usage

## 🧪 Testing Strategy

### **Testing Pyramid**
- **Unit Tests**: Individual functions and components (80%)
- **Integration Tests**: API endpoints and workflows (15%)
- **E2E Tests**: Critical user journeys (5%)

### **Test Coverage Goals**
- **Functions**: >80% coverage for all Netlify Functions
- **Components**: >70% coverage for React components
- **Critical Paths**: 100% coverage for auth and holiday request flows

### **Holiday Tracker Specific Tests**
- **Calendar functionality**: Date selection, range validation
- **Permission testing**: Role-based access, department visibility
- **Holiday overlaps**: Validate conflicting requests
- **Date calculations**: Working days, weekend handling

## 🚀 Deployment & DevOps

### **Repository & Platform Setup**
- **GitHub Repository**: Create repository with name "omnia-holiday-tracker"
- **Netlify Project**: Create Netlify project with name "omnia-holiday-tracker"
- **Auto-Deployment**: Manual webhook connection from GitHub to Netlify for automatic deployment on every commit
- **Domain**: Custom OmniaGroup subdomain will be configured after initial setup

### **Database Setup**
- **Primary Method**: Use `npx netlify db init` to create Neon database integration
- **Fallback Method**: If netlify db command fails, manually create Neon database and copy environment variables to `.env`
- **Environment Variables**: 
  ```bash
  DATABASE_URL=your_neon_database_url_from_netlify_or_manual_setup
  JWT_SECRET=your_generated_jwt_secret
  ```

### **Git Workflow**
- **Main Branch**: Production-ready code only
- **Feature Branches**: Individual features and fixes
- **PR Reviews**: Required before merging to main
- **Conventional Commits**: Standardized commit messages

### **Environment Strategy**
- **Development**: Local development with hot reload
- **Staging**: Preview deployments on Netlify
- **Production**: Main branch auto-deployment to OmniaGroup subdomain
- **Rollback**: Quick rollback capability for issues

### **Database Management**
- **Migrations**: Version-controlled schema changes
- **Backups**: Automated daily backups with retention
- **Monitoring**: Query performance and connection health
- **Scaling**: Connection pooling for serverless functions

## 📝 Documentation Standards

### **Code Documentation**
- **Functions**: JSDoc comments for all functions
- **Components**: PropTypes and usage examples
- **APIs**: Complete endpoint documentation
- **Database**: Schema documentation with relationships

### **User Documentation**
- **Setup Guide**: Development environment setup
- **API Reference**: Complete endpoint documentation
- **User Manual**: Employee and admin guides
- **Troubleshooting**: Common issues and solutions

## ⚠️ Risk Management

### **Technical Risks**
- **Calendar Performance**: Large datasets, complex date calculations
- **Database Connections**: Serverless connection limits
- **Authentication Issues**: JWT expiration, session management
- **Mobile Responsiveness**: Touch calendar interactions

### **Business Risks**
- **User Adoption**: Employee training and change management
- **Data Accuracy**: Holiday balances, approval workflows
- **Compliance**: Italian labor law requirements
- **Scalability**: Growing number of OmniaGroup employees

### **Mitigation Strategies**
- **Performance Testing**: Load testing with realistic data volumes
- **Monitoring**: Automated alerts for all critical systems
- **Documentation**: Comprehensive user guides and training materials
- **Backup Systems**: Multiple backup strategies and tested recovery

## 🎯 Success Metrics

### **Technical KPIs**
- **Uptime**: >99.5% availability
- **Performance**: <2s page load times
- **Error Rate**: <0.5% API error rate
- **Mobile Usage**: >60% mobile adoption

### **Business KPIs**
- **Employee Adoption**: >90% of employees using system
- **Request Processing**: <24h average approval time
- **User Satisfaction**: >4.5/5 rating from employee feedback
- **Admin Efficiency**: <5 minutes average approval time

## 🏢 OmniaGroup Specific Requirements

### **Company Structure**
- **Headquarters**: Italy (primary Italian interface)
- **International Presence**: English and Spanish support needed
- **Department Structure**: Multiple departments and locations
- **Employee Types**: Full-time, part-time, contractors (different holiday allowances)

### **Holiday Policies**
- **Italian Standards**: 20+ days standard vacation, sick leave tracking
- **Department Variations**: Different allowances per department/role
- **Approval Hierarchy**: Manager approval, admin override capabilities
- **Legal Compliance**: Track for Italian labor law reporting
- **Multi-domain Support**: Configurable email domain whitelist for all OmniaGroup companies

### **Integration Readiness**
- **Future HR Systems**: API-ready for integration
- **Email Systems**: Optional integration with company email
- **Calendar Systems**: Export capabilities for Outlook/Google Calendar
- **Reporting**: Export capabilities for HR reporting
- **Domain Configuration**: Admin can add/remove allowed email domains (omniaservices.net, omniaelectronics.com, etc.)

## 📊 Database Schema Design

### **Core Tables**
```sql
-- Users (Employees)
users: id, email, name, department_id, role, status, holiday_allowance, created_at

-- Departments  
departments: id, name, location, manager_id, created_at

-- Holiday Requests
holidays: id, user_id, start_date, end_date, type, status, notes, approved_by, created_at

-- System Settings
settings: id, key, value, updated_by, updated_at
```

### **Relationships**
- Users belong to Departments (many-to-one)
- Holidays belong to Users (many-to-one)
- Departments can have Managers (Users with special role)
- Settings track admin changes with audit trail

## 🎨 UI/UX Design Principles

### **Calendar-First Design**
- **Primary Interface**: Monthly calendar view with holiday visualization
- **Color Coding**: Different colors for holiday types and statuses
- **Quick Actions**: One-click holiday requests from calendar
- **Mobile Optimization**: Touch-friendly calendar navigation

### **Professional Corporate Feel**
- **Clean Design**: Minimal, professional interface suitable for workplace
- **Brand Consistency**: OmniaGroup colors and professional typography
- **Accessibility**: WCAG 2.1 compliant for all employees
- **Multi-device**: Seamless experience across desktop, tablet, mobile

### **User Experience Flow**
1. **Employee Login**: Simple email/password with domain validation
2. **Dashboard**: Calendar overview with personal holidays and team view
3. **Request Creation**: Simple form with date picker and validation
4. **Status Tracking**: Clear status indicators and approval progress
5. **Admin Management**: Comprehensive tools for holiday and employee management

This planning document serves as the single source of truth for the Omnia Holiday Tracker project architecture, decisions, and constraints. All development should reference this document before making architectural decisions.
