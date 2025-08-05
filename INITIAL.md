# INITIAL.md - Omnia Holiday Tracker

## FEATURE:

**Internal Employee Holiday Tracking SaaS** - Custom solution for OmniaGroup to manage employee holiday requests, approvals, and calendar visualization with **admin control** and **department management**.

**Business Model**: Internal company tool - no payments required. Custom for OmniaGroup employees only.

**Tech Stack**: Next.js 15 + TypeScript + Netlify Functions + Neon PostgreSQL + Drizzle ORM + Custom JWT Auth + React Calendar

⚠️ **CRITICAL**: Use **regular Next.js deployment** (NOT `output: 'export'`) for SaaS apps with middleware/server features!

**Key Flows**: 
- Employee: Register → Admin Approval → Request Holidays → Calendar View → Track Status
- Admin: Approve Employees → Configure Settings → Approve/Reject Requests → Manage Departments → View Analytics

**i18n Requirements**: Full Italian/English/Spanish translation with automatic language detection and user preference storage.

---

## EXAMPLES:

**`examples/netlify-functions/`**:
- `basic-function.ts` - Standard API template with CORS, validation, error handling
- `auth-protected-function.ts` - JWT validation, role-based access patterns  
- `database-function.ts` - Drizzle ORM operations, transactions, pooling
- `omnia-domain-validation.ts` - @ominiaservice.net domain validation

**`examples/components/`**:
- `holiday-request-form.tsx` - Multi-step form with date validation, conflict checking
- `calendar-component.tsx` - Calendar visualization with holiday color coding
- `admin-dashboard.tsx` - Employee management, approval interfaces
- `department-manager.tsx` - Department creation and employee assignment

**`examples/database/`**:
- `schema-example.ts` - Complete Drizzle schema with users, departments, holidays, settings
- `migrations-example.sql` - Migration patterns for schema evolution
- `queries-example.ts` - Common query patterns for holidays, users, departments

**`examples/auth/`** & **`examples/integrations/`**:
- Custom JWT authentication with domain validation
- Holiday request workflow management
- Calendar event processing and conflict detection
- Admin settings and configuration management

---

## DOCUMENTATION:

**Core References**:
- `CLAUDE.md` - Development guidelines adapted from CoupleCompatibility experience
- `PLANNING.md` - Complete architecture and design system for holiday tracking
- `TASK.md` - Organized development phases with lessons learned applied

**Technical Docs**:
- Next.js 15: https://nextjs.org/docs (App Router, i18n)
- Netlify Functions: https://docs.netlify.com/functions/
- Neon: https://neon.tech/docs (PostgreSQL, pooling)
- Drizzle ORM: https://orm.drizzle.team/
- React Big Calendar: https://github.com/jquense/react-big-calendar
- shadcn/ui: https://ui.shadcn.com/

**Holiday Management Inspiration**:
- Calamari.io - Simple holiday tracking
- BambooHR - HR management with holiday tracking
- Personio - European HR solutions
- Factorial.co - Spanish HR platform with holiday management

---

## OTHER CONSIDERATIONS:

**Critical Business Logic**:
1. **Domain Validation**: Only @ominiaservice.net emails can register
2. **Admin Control**: max.giurastante@ominiaservice.net has super admin access
3. **Department Management**: Employees can be assigned to departments with visibility controls
4. **Holiday Conflicts**: System must detect and warn about overlapping requests
5. **Settings Control**: Admin can configure visibility (all see all vs admin only) and approval mode

**Technical Architecture Lessons from CoupleCompatibility**:
6. **No Static Export**: Use regular Next.js deployment for middleware compatibility
7. **Translation Structure**: Hierarchical nested translations to avoid conflicts
8. **Serverless Optimization**: Connection pooling and small functions for performance
9. **Mobile-First**: Holiday requests primarily happen on mobile devices
10. **Calendar Performance**: Optimize for fast calendar rendering and date operations

**i18n Implementation**:
11. **Language Priority**: Italian primary, English for international staff, Spanish for expansion
12. **Content Translation**: All UI text, error messages, email notifications
13. **Date Formatting**: Locale-specific date display (DD/MM/YYYY for IT, MM/DD/YYYY for EN)
14. **Holiday Types**: Translated vacation/sick/personal day types
15. **Admin Interface**: Italian-focused for primary admin user

**UX/Performance**:
16. **Calendar-Centric**: Primary interface is monthly calendar view
17. **Touch-Friendly**: Large touch targets for mobile holiday selection
18. **Status Visualization**: Clear color coding for pending/approved/rejected requests
19. **Quick Actions**: One-click holiday requests directly from calendar
20. **Offline Viewing**: Basic offline capability for viewing approved holidays

**Security/Compliance**:
21. **Domain Restriction**: Strict validation of OmniaGroup email domain
22. **Role-Based Access**: Clear separation between employee and admin capabilities
23. **Audit Trail**: Log all admin actions and holiday approvals for HR compliance
24. **Data Protection**: GDPR compliance for employee personal information
25. **Italian Labor Law**: Track holiday balances according to Italian regulations

**Holiday-Specific Features**:
26. **Date Validation**: Prevent past-date requests, weekend handling, holiday conflicts
27. **Balance Tracking**: Track remaining holiday days per employee
28. **Approval Workflow**: Configurable approval process (auto vs manual)
29. **Department Visibility**: Employees can see team holidays if enabled
30. **Export Capabilities**: Calendar export for personal calendar applications

**Mobile & Accessibility**:
31. **Responsive Calendar**: Calendar that works perfectly on all screen sizes
32. **Touch Gestures**: Swipe navigation, pinch zoom, long-press selections
33. **Accessibility**: Screen reader support, keyboard navigation
34. **Progressive Web App**: PWA features for native app-like experience
35. **Offline Support**: View holidays and status when offline

**Admin Management Features**:
36. **Employee Approval**: Approve new employee registrations
37. **Bulk Operations**: Approve/reject multiple requests at once
38. **Analytics Dashboard**: Holiday usage statistics, department reporting
39. **Settings Management**: Configure system behavior (visibility, approval mode)
40. **Department Setup**: Create departments, assign managers, set policies

**Integration Readiness**:
41. **API-First Design**: RESTful APIs ready for future integrations
42. **Calendar Export**: ICS export for Outlook/Google Calendar
43. **HR System Integration**: Prepared for future HRIS integration
44. **Email Notifications**: Optional email integration for notifications
45. **Reporting**: Export capabilities for HR and compliance reporting

**Common Development Pitfalls to Avoid**:
46. **Translation Conflicts**: Use nested structure, test all languages
47. **Calendar Performance**: Optimize for large datasets, lazy loading
48. **Mobile Touch Issues**: Test all interactions on actual devices
49. **Authentication Persistence**: Proper session management and token refresh
50. **Database Connections**: Connection pooling for serverless functions

**Deployment Essentials**:
- Zero-downtime deployments with proper testing
- Automated database migrations with rollback capability
- Environment-specific configuration management
- Monitoring and alerting for all critical functions
- Backup and recovery procedures for employee data
