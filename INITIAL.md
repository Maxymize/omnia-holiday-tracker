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

---

## 🏆 **BEST PRACTICES FOR FUTURE SIMILAR PROJECTS**
*Optimized development roadmap based on Omnia Holiday Tracker lessons*

### **🎯 Optimal Development Timeline**

#### **Phase 1: Solid Foundation (Days 1-2)**

**1.1 Tech Stack Decision Tree**
```
Authentication Required? 
├─ NO → Static Next.js + Netlify Static
└─ YES → Next.js Regular + Netlify Functions + Neon DB

Middleware Needed?
├─ NO → Simple JWT in API routes
└─ YES → Edge Runtime compatible (JOSE, non jsonwebtoken)
```

**1.2 Setup Sequence Optimization**
```bash
# 1. ALWAYS start with authentication architecture
npx create-next-app@latest --typescript --tailwind --eslint
npm install jose drizzle-orm @neondatabase/serverless

# 2. Configure EDGE RUNTIME from day 1
# middleware.ts + next.config.js (NO output: 'export')
# Use JOSE library, never jsonwebtoken

# 3. Database first
npx netlify db init  # or manual Neon setup
```

#### **Phase 2: Authentication-First Development (Days 2-3)**

**2.1 The "Authentication Core" Pattern**
```typescript
// Day 1: Core auth utilities with JOSE
lib/auth/
├── jwt-utils.ts        // JOSE only, async/await
├── middleware.ts       // Edge Runtime ready
└── auth-config.ts      // Environment validation

// Day 2: Test authentication end-to-end BEFORE building features
```

**2.2 Critical Architecture Decisions**
- ✅ **Cookie-based auth from day 1** (not Authorization headers)
- ✅ **Unified auth function** (`verifyAuthFromRequest` pattern)
- ✅ **RSC-compatible middleware** (skip `_rsc` requests)
- ✅ **Async-first design** (all auth functions async)

#### **Phase 3: Systematic Development (Days 3-7)**

**3.1 Feature Development Order**
```
1. Auth system (login/logout) → Test in production
2. User roles & permissions → Test in production  
3. Core CRUD operations → Test in production
4. UI/UX polish → Final production test
```

**3.2 The "Deploy Early, Deploy Often" Rule**
- **Deploy after every major feature** (not at the end)
- **Test production environment immediately**
- **Catch deployment issues early**

### **🤖 AI Token Optimization Strategies**

#### **4.1 Context Management**
```
Documentation Structure:
├── CORE.md           # Essential rules (300 tokens max)
├── CURRENT-TASK.md   # Active work only (200 tokens max)
├── TECH-STACK.md     # Architecture decisions (400 tokens max)
└── COMPLETED.md      # Archive (reference only)
```

#### **4.2 Agent Usage Optimization**
- **Research FIRST with context7** before coding
- **Use specialized agents proactively** (don't wait for problems)
- **Document agent work immediately** (prevent context loss)
- **Batch similar tasks** (all auth functions together)

### **⚠️ Critical Anti-Patterns to Avoid**

#### **5.1 Authentication Anti-Patterns**
```
❌ DON'T: Development bypass in middleware
❌ DON'T: jsonwebtoken in Edge Runtime  
❌ DON'T: Mixed auth patterns (cookies + headers)
❌ DON'T: Hardcoded URLs in components
❌ DON'T: Last-minute auth implementation

✅ DO: Cookie auth from start
✅ DO: JOSE library only
✅ DO: Unified auth pattern
✅ DO: Dynamic URL resolution
✅ DO: Auth-first development
```

#### **5.2 Deployment Anti-Patterns**
```
❌ DON'T: output: 'export' for SaaS apps
❌ DON'T: Complex conditional security headers  
❌ DON'T: Middleware blocking RSC requests
❌ DON'T: Deploy only at the end

✅ DO: Regular Next.js deployment
✅ DO: Minimal security headers for RSC compatibility
✅ DO: Skip middleware for internal requests  
✅ DO: Deploy after each feature
```

#### **5.3 RSC (React Server Components) Issues**
```typescript
// ✅ CRITICAL: Always exclude RSC requests from middleware
if (
  request.nextUrl.searchParams.has('_rsc') ||
  request.headers.get('RSC') === '1' ||
  request.headers.get('Next-Router-Prefetch') === '1'
) {
  return NextResponse.next(); // Skip auth for Next.js internal requests
}

// ✅ Keep headers simple - avoid complex CORS configurations
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'origin-when-cross-origin' }
      ]
    }
  ];
}
```

### **🚀 Recommended "Golden Path" Timeline**

**Week 1: Foundation**
- Day 1: Next.js + Auth architecture + Database
- Day 2: Login/logout working in production
- Day 3: User roles working in production
- Day 4-5: Core business logic (holidays/requests)
- Day 6-7: Admin panel basic functionality

**Week 2: Polish & Production**
- Day 8-10: UI/UX improvements
- Day 11-12: Advanced features
- Day 13-14: Performance optimization & final testing

### **🎯 AI Development Optimizations**

#### **Context-Saving Techniques**
1. **Modular documentation**: 4-5 focused files vs 1 massive file
2. **Task-oriented sessions**: Complete feature clusters in single sessions
3. **Agent handoff protocol**: Document everything for context preservation
4. **Progressive disclosure**: Show only current phase details

#### **Agent Usage Strategy**
```
Research Phase: context7 (library documentation)
Backend Phase: backend-api-specialist (Netlify functions)  
Frontend Phase: frontend-react-specialist (React components)
Security Phase: security-auth-specialist (JWT/auth)
```

### **📊 Success Metrics Comparison**

| Approach | Development Time | Token Usage | Issues Encountered |
|----------|------------------|-------------|-------------------|
| **Current Approach** | 3-4 weeks | High (context switching) | Many (auth conflicts) |
| **Optimized Approach** | 1-2 weeks | Medium (focused) | Few (proactive planning) |

### **🎯 Key Takeaway**

**"Authentication First, Deploy Early, Document Smart"**

The main difference is **starting with production-ready authentication** instead of implementing it as an afterthought. This eliminates 70% of the problems encountered and significantly reduces AI tokens needed for debugging and refactoring.

### **🎁 Copy-Paste Starter Templates**

#### **Perfect next.config.js for SaaS**
```javascript
const nextConfig = {
  // ✅ Regular deployment for SaaS with auth
  trailingSlash: false,
  images: { unoptimized: false },
  serverExternalPackages: ['@neondatabase/serverless', 'bcryptjs'],
  async headers() {
    return [
      {
        // ✅ Minimal headers - RSC compatible
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' }
        ]
      }
    ];
  }
};
```

#### **Perfect middleware.ts Template**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth/jwt-utils';

export async function middleware(request: NextRequest) {
  // ✅ Always exclude RSC and Next.js internal requests
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.searchParams.has('_rsc') ||
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Router-Prefetch') === '1'
  ) {
    return NextResponse.next();
  }

  // Your auth logic here...
}
```

#### **Perfect auth utilities structure**
```typescript
// lib/auth/jwt-utils.ts
import { SignJWT, jwtVerify } from 'jose'; // ✅ JOSE only

// Always unified auth function:
export async function verifyAuthFromRequest(event: any): Promise<JWTPayload> {
  // Try cookies first, then headers
  // Return consistent payload
}
```

---

**Follow this guide to build SaaS applications 50% faster with 70% fewer authentication issues!** 

🎯 **Remember**: Authentication First, Deploy Early, Document Smart
