# Claude Rules for Omnia Holiday Tracker Project

## 🎯 PROJECT CONTEXT & MEMORY PRIORITY
**This is the PRIMARY memory file for Claude Code. ALL other instructions and files MUST be read from this central hub.**

### **📚 MANDATORY FILE READING SEQUENCE**
Claude Code MUST read these files in order at session start:

1. **CLAUDE.md** (this file) - Core rules and project overview
2. **TASK.md** - ACTIVE TASKS ONLY (optimized for context preservation)
3. **STATUS-HANDOFF.md** - Current project state and next steps
4. **AGENT-WORK-LOG.md** - Recent agent work history
5. **PLANNING.md** - Complete architecture and technology stack (when needed)
6. **CLAUDE-CODE-INSTRUCTIONS.md** - Detailed agent usage (reference only)
7. **TASK-COMPLETED.md** - Completed work archive (reference only)

**CONTEXT OPTIMIZATION**: Files are now structured to minimize context usage while maintaining full project visibility.

### **🚨 CRITICAL SUCCESS FACTORS**
- **USE AI AGENTS PROACTIVELY** - Never wait for explicit requests
- **FOLLOW HANDOFF PROTOCOL** - Always document and read agent work
- **RESEARCH WITH context7 FIRST** - Before implementing any library
- **VALIDATE AGENT WORK** - Always test before proceeding

## 🔄 Project Awareness & Context
## 🔄 Project Awareness & Context

**PROJECT**: Omnia Holiday Tracker - Internal SaaS for OmniaGroup employee holiday management
**BUSINESS MODEL**: Custom internal tool for OmniaGroup companies (NOT public/paid service)
**ADMIN**: max.giurastante@omniaservices.net (primary administrator)
**DOMAINS**: omniaservices.net, omniaelectronics.com + additional configurable domains

### **📋 CURRENT PROJECT STATUS**
- **Phase**: Integration & Production Readiness (Phase 4 of 6) 
- **Progress**: ~75% complete (Phases 1-3 completed)
- **Critical Tasks**: Holiday workflow completion, admin panel integration
- **Context Optimized**: Task files restructured for better context preservation
- **Stack**: Next.js 15, TypeScript, NEON DB, Netlify Functions
- **Languages**: Italian (primary), English, Spanish

### **🎯 SESSION PRIORITIES**
1. **Read optimized documentation files** in the sequence above
2. **Focus on active tasks only** (Phase 4 integration)
3. **Check STATUS-HANDOFF.md** for current project state  
4. **Use AI agents proactively** with proper handoff documentation
5. **Complete Phase 4 integration** following streamlined TASK.md

- **Always read `PLANNING.md`** at the start to understand architecture, goals, and constraints
- **Check `TASK.md`** before starting - includes mandatory AI agent protocols
- **Review `.env.example`** for environment variables and domain configuration
- **Use consistent patterns** as described in all documentation files

## 🏗️ Architecture & Stack Adherence

**TECH STACK** (see PLANNING.md for full details):
- **Frontend**: Next.js 15 with App Router, TypeScript, **regular deployment** (NOT static export)
- **Backend**: Netlify Functions (serverless) in `/netlify/functions/`
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Auth**: Custom authentication with JWT (admin: max.giurastante@omniaservices.net)
- **Domains**: Multi-domain support (omniaservices.net, omniaelectronics.com + configurable)
- **Languages**: IT/EN/ES with automatic detection
- **Storage**: Local file storage for small reports/exports (no PDF storage needed)
- **Email**: Simple notification system (optional - can use browser notifications)
- **Payments**: NOT NEEDED - internal company tool
- **Scheduling**: Netlify Scheduled Functions for reminders and cleanup

**INFRASTRUCTURE SETUP**:
- **GitHub Repo**: "omnia-holiday-tracker" (exact name required)
- **Netlify Project**: "omnia-holiday-tracker" (exact name required)
- **Database**: `npx netlify db init` (primary) or manual NEON setup (fallback)
- **Webhook**: Manual GitHub → Netlify connection for auto-deploy

## ⚠️ CRITICAL DEPLOYMENT ARCHITECTURE RULE

**🚨 FOR SAAS APPLICATIONS: NEVER USE `output: 'export'` in next.config.js**

### The Problem We Solved in CoupleCompatibility:
- Started with static export thinking it was simpler
- Added middleware for language detection and auth routing  
- Created incompatibility: middleware needs server, static export removes server
- Result: 500 errors, broken development server, deployment issues

### The Correct Approach for Omnia Holiday Tracker:
```javascript
// ✅ CORRECT next.config.js for SaaS
const nextConfig = {
  // NO output: 'export' - use regular Next.js deployment
  trailingSlash: true,
  images: { unoptimized: false }, // Enable Next.js optimization
  serverExternalPackages: ['@neondatabase/serverless', 'bcryptjs'],
  // ... rest of config
}
```

### Decision Matrix:
- **✅ Use Regular Deployment For**: SaaS apps, auth systems, middleware, Netlify Functions, server features
- **✅ Use Static Export For**: Pure marketing sites, blogs, documentation without server features

### Why This Matters for Holiday Tracker:
- Middleware.ts required for auto language detection (IT/EN/ES)
- Custom auth system for OmniaGroup employee verification
- Admin dashboard with complex permissions and data filtering
- Calendar integrations may need server-side processing

**📝 Always check requirements first and choose deployment strategy accordingly.**

## 🧱 Code Structure & Organization

### Frontend Structure
```
app/
├── (public)/             # Public pages (login, company info)
├── (employee)/           # Employee dashboard and holiday requests
├── (admin)/              # Admin dashboard for approval and management
└── api/                  # API routes (if needed for client-side)

components/
├── ui/                   # shadcn/ui base components
├── calendar/             # Calendar components (request, view, manage)
├── dashboard/            # Dashboard specific components  
├── auth/                 # Authentication components
├── departments/          # Department management components
└── forms/                # Holiday request and management forms
```

### Netlify Functions Structure
```
netlify/functions/
├── auth/
│   ├── login.ts              # Employee login with domain validation
│   ├── admin-approve.ts      # Admin approval of new employees
│   └── profile.ts            # Employee profile management
├── holidays/
│   ├── create-request.ts     # New holiday request submission
│   ├── approve-reject.ts     # Admin approval/rejection
│   ├── get-holidays.ts       # Fetch holidays (role-based filtering)
│   └── edit-request.ts       # Edit existing requests (if allowed)
├── departments/
│   ├── create-department.ts  # Admin creates new departments
│   ├── assign-employee.ts    # Assign employee to department
│   └── get-departments.ts    # List all departments
├── users/
│   ├── get-employees.ts      # List employees (admin view)
│   ├── register.ts           # Employee registration
│   └── update-employee.ts    # Admin updates employee info
├── settings/
│   ├── get-settings.ts       # Get system configuration
│   └── update-settings.ts    # Admin updates visibility/approval mode
└── notifications/
    ├── send-email.ts         # Optional email notifications
    └── holiday-reminders.ts  # Scheduled reminders for managers
```

### File Size Limits (Lessons from CoupleCompatibility)
- **Never create a component file longer than 300 lines**. Split into smaller, focused components.
- **Never create a Netlify function longer than 200 lines**. Use helper modules in `/lib/` or `/utils/`.
- **API functions should focus on a single responsibility** (create, read, update, delete specific resources).

## 🎨 UI/UX Standards
- **Use Tailwind CSS** with OmniaGroup brand colors and modern design system
- **Use shadcn/ui components** as the base, customize with company branding
- **Follow the color palette**: Primary (OmniaGroup Blue/Green), Secondary (professional grays), accent colors for status
- **Implement all animations with Framer Motion** using consistent animation variants
- **Ensure responsive design** with mobile-first approach (employees use phones/tablets)
- **Loading states**: Use skeleton components and proper loading indicators
- **Error states**: Provide clear, actionable error messages with recovery options
- **Calendar-focused UI**: Primary interface is calendar-based for intuitive holiday visualization

## 🧪 Testing & Reliability (Adapted from CoupleCompatibility experience)
- **Create tests for all Netlify Functions** using Vitest in `__tests__/functions/`
- **Test critical user flows** with Playwright E2E tests in `__tests__/e2e/`
- **Component tests** for complex UI logic using React Testing Library in `__tests__/components/`
- **After updating any logic**, check whether existing tests need updates and modify accordingly
- **Include at least for each function**:
  - 1 test for expected/successful use case
  - 1 test for invalid input (400 error)
  - 1 test for unauthorized access (401/403 error)
  - 1 test for edge cases or failures

### Test Structure
```
__tests__/
├── functions/              # Netlify Functions tests
│   ├── holidays/
│   ├── auth/
│   └── departments/
├── components/             # React component tests
├── e2e/                   # End-to-end Playwright tests
└── helpers/               # Test utilities and mocks
```

## 🔐 Security & Privacy (Enhanced for Corporate Environment)
- **Never expose sensitive data** in client-side code (API keys, secrets)
- **Always validate input** on both client and server using Zod schemas
- **Implement proper authorization checks** in Netlify Functions using JWT tokens
- **Employee data isolation**: Employees can only see own data (unless admin settings allow)
- **Admin role verification**: Only max.giurastante@omniaservices.net can perform admin actions initially
- **Multi-domain validation**: Configurable email domains for OmniaGroup and partners
- **Department-based access**: Employees can see department colleagues if enabled
- **Rate limiting**: Implement rate limiting for registration and request creation
- **CORS configuration**: Properly configure CORS for Netlify Functions
- **Audit logging**: Track all admin actions and holiday requests for compliance

## 📦 Database & Data Management
- **Use Drizzle ORM** for all database operations with Neon PostgreSQL
- **Never write raw SQL** unless absolutely necessary for complex reporting queries
- **Always use database transactions** for multi-table operations (employee + department assignment)
- **Implement proper error handling** with automatic rollbacks on failures
- **Use database migrations** stored in `drizzle/migrations/` for schema changes
- **Keep schema definitions** in `drizzle/schema.ts` with proper TypeScript types
- **Connection management**: Use connection pooling appropriately for serverless functions

## 🚀 Deployment & Performance
- **Optimize images** with next/image and proper sizing/formats (WebP, AVIF)
- **Use dynamic imports** for heavy components and calendar libraries
- **Implement proper loading states** with skeleton components for calendar loading
- **Cache static assets** using Netlify's CDN capabilities
- **Monitor bundle size** - keep initial JS bundle under 200kb
- **Use Static Site Generation (SSG)** for login page and company info
- **Server-side rendering (SSR)** for dashboard pages with real-time data

## ✅ Task Completion
- **Mark completed tasks in `TASK.md`** immediately after finishing them with ✅
- **Add new sub-tasks or issues discovered** during development to `TASK.md` under "Discovered During Work" section
- **Include task context**: Brief description of what was done and any important notes
- **Break large tasks** into smaller, manageable subtasks with clear acceptance criteria

## 📎 Style & Conventions

### ESLint Configuration - Optimal Compromise for SaaS Projects
```json
// .eslintrc.json - Minimal ESLint: 90% benefits, 10% problems
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off", 
    "prefer-const": "warn"
  }
}
```

**Recommendation**: Prettier + TypeScript strict + ESLint minimal = perfect balance quality/speed for SaaS projects.

**Avoid**: Ultra-strict ESLint that blocks development with errors on `any`, unused vars, console.log - wastes too many tokens for debugging.

### TypeScript Standards
```typescript
// Use explicit interfaces for all data structures
interface HolidayRequest {
  employee: EmployeeInfo;
  startDate: string;
  endDate: string;
  type: HolidayType;
  status: RequestStatus;
  notes?: string;
}

// Use enums for constants and status values
enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

enum HolidayType {
  VACATION = 'vacation',
  SICK = 'sick',
  PERSONAL = 'personal'
}

// Proper async/await error handling
async function createHolidayRequest(data: HolidayRequest): Promise<ApiResponse<Holiday>> {
  try {
    const result = await createRequestInDB(data);
    await notifyManager(result.id);
    return { success: true, data: result };
  } catch (error) {
    console.error('Holiday request creation failed:', error);
    return { 
      success: false, 
      error: 'Failed to create holiday request. Please try again.' 
    };
  }
}
```

### React Components Standards
```tsx
// Use functional components with proper TypeScript interfaces
interface HolidayCardProps {
  holiday: Holiday;
  onStatusChange?: (id: string, status: RequestStatus) => Promise<void>;
  showActions?: boolean;
  className?: string;
}

export function HolidayCard({ holiday, onStatusChange, showActions = true, className }: HolidayCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Proper error and loading state management
  const handleStatusChange = async (newStatus: RequestStatus) => {
    if (!onStatusChange) return;
    
    setIsLoading(true);
    try {
      await onStatusChange(holiday.id, newStatus);
    } catch (error) {
      toast.error('Failed to update holiday status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn("holiday-card", className)}>
      {/* Component JSX */}
    </Card>
  );
}
```

### Netlify Functions Standards
```typescript
import { Handler } from '@netlify/functions';
import { z } from 'zod';

// Input validation schema
const createHolidaySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['vacation', 'sick', 'personal']),
  notes: z.string().optional()
});

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Authentication check
    const user = await verifyJWT(event.headers.authorization);
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Domain validation for OmniaGroup
    if (!user.email.endsWith('@ominiaservice.net')) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied - OmniaGroup employees only' })
      };
    }

    // Input validation
    const body = JSON.parse(event.body || '{}');
    const validatedData = createHolidaySchema.parse(body);

    // Business logic
    const holidayRequest = await createHolidayRequest({
      ...validatedData,
      employeeId: user.id,
      status: 'pending'
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: holidayRequest })
    };

  } catch (error) {
    console.error('Function error:', error);
    
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid input', 
          details: error.errors 
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

## 🌍 Translation System Rules (CRITICAL - Lessons from CoupleCompatibility)

### **🚨 CRITICAL TRANSLATION ARCHITECTURE RULES**

Based on troubleshooting session where translation keys appeared instead of translations, these rules are **MANDATORY**:

#### **❌ NEVER Create Duplicate Object Keys**
```typescript
// 🚨 WRONG - This creates conflicts and breaks translations
const translations = {
  en: {
    dashboard: { calendar: { /* keys */ } },  // First definition
    // ... other sections
    dashboard: { holidays: { /* keys */ } }   // DUPLICATE! Overwrites first
  }
}
```

#### **✅ ALWAYS Use Hierarchical Nested Structure**
```typescript
// ✅ CORRECT - Single nested structure prevents conflicts
const translations = {
  en: {
    dashboard: {
      calendar: { /* all calendar keys */ },
      holidays: { /* all holiday keys */ },
      profile: { /* all profile keys */ }
    },
    auth: { /* auth translations */ },
    admin: { /* admin translations */ }
  }
}
```

#### **🎯 Component Translation Usage Rules for Holiday Tracker**

**MANDATORY**: Always use the full nested path in components:

```typescript
// ✅ CORRECT - Use full nested path
t('dashboard.calendar.addHoliday')
t('dashboard.holidays.requestVacation')
t('admin.employees.approveRequest')

// ❌ WRONG - Direct access shows keys instead of translations
t('calendar.addHoliday')
t('holidays.requestVacation')
```

#### **🔍 Translation Debugging Process**

When translation keys appear instead of translations:

1. **Check for duplicates**: `grep -n "dashboard:" src/lib/i18n/index.ts`
2. **Verify nested structure** consistency across ALL languages (en, it, es)
3. **Update component paths** to match nested structure
4. **Test all languages** after changes

#### **📋 Translation Development Checklist for Holiday Tracker**

Before any commit involving translations:
- [ ] No duplicate object keys in translation structure
- [ ] All languages (en, it, es) have identical nested structure
- [ ] All components use full nested paths (e.g., `dashboard.calendar.*`)
- [ ] Tested language switching on affected pages
- [ ] No raw translation keys appear in UI
- [ ] Console shows no translation errors

#### **⚠️ Common Translation Mistakes**
1. **Root-level duplicates**: Having multiple `dashboard:` objects at same level
2. **Inconsistent nesting**: Different structure across languages
3. **Component path mismatch**: Using `t('calendar.*)` instead of `t('dashboard.calendar.*)`
4. **Missing translations**: Keys exist in one language but not others

## 🎯 Business Model Specific Rules for Holiday Tracker
- **Employee workflow**: Register → Admin Approval → Request Holidays → Manager Approval → Calendar Update
- **Admin controls**: Visibility settings (all see all vs admin only), approval mode (manual vs auto)
- **Department management**: Create departments, assign employees, department-based visibility
- **OmniaGroup specific**: Only @ominiaservice.net domain allowed, max.giurastante@ominiaservice.net as super admin
- **Multi-language support**: Italian primary, English and Spanish for international employees
- **Calendar-centric design**: Main interface is calendar view with easy request creation
- **Mobile-first**: Employees primarily use mobile devices for holiday requests

## 📚 Documentation & Maintenance
- **Update README.md** when adding features, changing setup, or modifying dependencies
- **Document all Netlify Functions** with JSDoc comments explaining parameters and return values
- **Include usage examples** in function documentation for complex operations
- **Document business logic** with inline comments explaining OmniaGroup-specific requirements
- **Maintain API documentation** for function endpoints
- **Keep environment variables documentation** updated in `.env.example`

## 🤖 AI Agents & MCP Tools Usage (CRITICAL - USE ALWAYS)

### **🚨 MANDATORY TOOL USAGE**
**Claude Code MUST actively use specialized agents and MCP tools without explicit requests.**

### **🚨 CRITICAL: Agent Documentation Requirements**

**EVERY AGENT MUST**:
1. ✅ **Update TASK.md** with detailed completion status
2. ✅ **Document in AGENT-WORK-LOG.md** with full work summary:
   - Actions taken and decisions made
   - Files created/modified with descriptions
   - Validation completed (tests, builds)
   - Key insights and recommendations
3. ✅ **Update STATUS-HANDOFF.md** with current state and next steps
4. ✅ **Specify next recommended agent** and prerequisites

**CLAUDE CODE MUST ALWAYS**:
1. 📖 **Read documentation immediately** after any agent work:
   - AGENT-WORK-LOG.md (what was done)
   - STATUS-HANDOFF.md (current state)
   - Updated TASK.md (completion status)
2. ✅ **Validate agent work** (run builds, tests, functionality checks)
3. 📝 **Acknowledge understanding** explicitly before continuing
4. ➡️ **Follow recommended next steps** from agent documentation

**This protocol eliminates context loss and ensures project continuity.**

### **Available Specialized Agents**
- **backend-api-specialist**: Use for Netlify Functions, API design, database operations
- **frontend-react-specialist**: Use for React components, Next.js setup, UI implementation  
- **database-specialist**: Use for Drizzle schema, migrations, query optimization
- **security-auth-specialist**: Use for JWT implementation, authentication flows, security
- **seo-engineer**: Use for meta tags, performance optimization, accessibility
- **web-copywriter**: Use for UI text, error messages, user-facing content

### **MCP Servers Available**
- **context7**: Documentation for ANY library, tool, or framework (React, Next.js, Drizzle, etc.)
- **Check available MCPs**: Use MCP list command to see all installed servers

### **When to Use Each Agent**

#### **Backend Development** → backend-api-specialist
- Netlify Functions architecture and implementation
- API endpoint design and error handling
- Database connection and query optimization
- Server-side business logic and validation

#### **Frontend Development** → frontend-react-specialist  
- React component architecture and patterns
- Next.js 15 App Router implementation
- Tailwind CSS and shadcn/ui integration
- Calendar component implementation and optimization

#### **Database Work** → database-specialist
- Drizzle ORM schema design and relationships
- Database migrations and seeding
- Query performance optimization
- Connection pooling for serverless functions

#### **Authentication & Security** → security-auth-specialist
- Custom JWT implementation and management
- Role-based access control (employee/admin)
- Input validation and sanitization
- Security headers and CORS configuration

#### **Documentation & Research** → context7 MCP
```bash
# Always research unfamiliar libraries/tools
@context7 search "next.js 15 app router"
@context7 search "drizzle orm with neon"
@context7 search "react big calendar implementation" 
@context7 search "netlify functions best practices"
```

### **Mandatory Usage Rules**
1. **ALWAYS consult context7** before implementing any new library or tool
2. **ALWAYS delegate to specialists** for their expertise areas
3. **NEVER implement complex features alone** - use the appropriate agent
4. **RESEARCH FIRST**: Use context7 to understand best practices before coding

## 🧠 AI Behavior Rules
- **Never assume missing context** - ask for clarification if OmniaGroup requirements are unclear
- **Verify package compatibility** with Next.js 15 and Netlify before suggesting dependencies
- **Always check file paths exist** before referencing them in imports or configuration
- **Never delete production data** or critical configuration without explicit confirmation
- **Follow Netlify best practices** for function performance and cold start optimization
- **Consider serverless limitations**: execution time limits, memory constraints, cold starts
- **Respect monorepo structure** - keep all code in single repository with clear separation

## 🚀 Deployment & DevOps (Updated with GitHub/Netlify Setup)

### **Initial Platform Setup Process**
1. **GitHub Repository Setup**:
   - Create repository with exact name: "omnia-holiday-tracker"
   - Initialize with README and .gitignore
   - Set main branch as default

2. **Netlify Project Setup**:
   - Create Netlify project with exact name: "omnia-holiday-tracker"
   - **Important**: Do NOT auto-connect GitHub initially
   - Manual webhook setup required for controlled deployment

3. **Manual Webhook Connection**:
   - Connect GitHub repository to Netlify project manually
   - Configure auto-deployment on main branch commits
   - Setup branch deploy previews for feature branches

### **Database Integration Workflow**
```bash
# Primary method (recommended)
npx netlify db init

# Expected outcome: Neon database automatically configured
# Environment variables automatically added to Netlify
```

**If `npx netlify db init` fails**:
1. Manually create Neon database at https://neon.tech
2. Copy connection string from Neon dashboard
3. Add `DATABASE_URL` to both:
   - Local `.env` file for development
   - Netlify environment variables for production

## 🔧 Development Workflow
1. **Local development**: Use `netlify dev` for local function testing
2. **Environment variables**: Use `.env` for local, Netlify dashboard for production
3. **Database changes**: Always create Drizzle migrations before deployment
4. **Testing**: Run unit tests (`npm test`) and E2E tests before committing
5. **Preview deploys**: Use Netlify preview deployments for feature testing
6. **Production deployment**: Deploy only from main branch with proper CI/CD

## 🚨 CLAUDE CODE SESSION STARTUP CHECKLIST

### **MANDATORY ACTIONS ON EVERY SESSION START**:

1. **📚 READ DOCUMENTATION SEQUENCE** (in this exact order):
   ```bash
   1. CLAUDE.md (this file) ✅
   2. PLANNING.md (architecture)
   3. TASK.md (current status + AI protocols)
   4. CLAUDE-CODE-INSTRUCTIONS.md (detailed agent usage)
   5. AGENT-WORK-LOG.md (previous agent work)
   6. STATUS-HANDOFF.md (current state)
   7. DOMAIN-CONFIG.md (multi-domain setup)
   8. README.md (setup instructions)
   9. .env.example (environment config)
   ```

2. **🔍 ASSESS CURRENT STATE**:
   - What phase are we in? (Check TASK.md)
   - What did the last agent accomplish? (Check AGENT-WORK-LOG.md)
   - What needs to be done next? (Check STATUS-HANDOFF.md)

3. **🤖 PREPARE AI TOOLS**:
   - Identify which agents are needed for current tasks
   - Check available MCP tools (context7 priority)
   - Plan research needs before implementation

4. **✅ VALIDATE EXISTING WORK**:
   - Run `npm run build` if applicable
   - Test functionality of completed features
   - Verify environment setup

5. **📝 ACKNOWLEDGE UNDERSTANDING**:
   - Confirm what phase/task you're working on
   - Acknowledge any previous agent work
   - State your plan for the session

### **SESSION SUCCESS CRITERIA**:
- ✅ All documentation read and understood
- ✅ Current state assessed and validated
- ✅ AI agents used proactively with proper documentation
- ✅ Progress documented according to handoff protocol
- ✅ Next steps clearly defined for future sessions

### **CRITICAL REMINDERS**:
- **NEVER** implement libraries without researching with context7 first
- **ALWAYS** use specialized agents for their expertise areas
- **ALWAYS** document agent work according to handoff protocol
- **ALWAYS** validate work before continuing
- **REMEMBER** this is for OmniaGroup internal use (omniaservices.net, omniaelectronics.com)

---

**This CLAUDE.md file is your primary memory and control center. All other instructions flow from here. Follow this checklist religiously for consistent project success.** 🎯

## 📝 Commit Conventions
- Use conventional commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
- Keep commits focused and atomic (one logical change per commit)
- Write clear commit messages explaining what changed and why
- Reference TASK.md items in commits when applicable

## ⚠️ Critical Business Rules for OmniaGroup
- **NEVER allow non-OmniaGroup access** - configurable domain validation system
- **PROTECT admin functions** with role-based access control
- **SANITIZE all user input** before database storage to prevent injection attacks
- **IMPLEMENT rate limiting** on registration and request creation to prevent abuse
- **BACKUP strategy**: Ensure Neon has automated backups enabled
- **MONITOR usage**: Track function execution times and database usage for cost control
- **AUDIT trail**: Log all admin actions and holiday approvals for HR compliance
- **Data retention**: Implement data retention policies for employee records

## 🌍 OmniaGroup Specific Requirements
- **Primary admin**: max.giurastante@omniaservices.net has full access
- **Multi-domain validation**: Configurable allowed domains for employee registration
- **Department structure**: Support for multiple office locations and departments
- **Holiday policies**: Support for different holiday allowances per employee/department
- **Compliance**: Track holiday requests for Italian labor law compliance
- **Integration ready**: Prepared for future integrations with HR systems

## 🚀 Performance Optimization (Lessons from CoupleCompatibility)
- **Calendar optimization**: Lazy load calendar events, implement virtual scrolling for large datasets
- **Database indexing**: Proper indexes on employee_id, date ranges, status for fast queries
- **Caching strategy**: Cache department lists, employee data, holiday statistics
- **Mobile optimization**: Touch-friendly calendar interface, offline capability for viewing
- **Bundle splitting**: Separate admin dashboard from employee dashboard for faster loading
