# 🤖 Claude Code - Specific Instructions

## 🚨 CRITICAL: Always Use Available Tools

### **Mandatory Tool Usage - No Exceptions**

You have access to specialized agents and MCP tools that you MUST use actively:

#### **🔧 Specialized Agents - Use Proactively**
```bash
# For backend development
@backend-api-specialist "Design Netlify Functions for holiday requests API"

# For frontend development  
@frontend-react-specialist "Create calendar component with React Big Calendar"

# For database work
@database-specialist "Design Drizzle schema for holiday tracking system"

# For security implementation
@security-auth-specialist "Implement JWT authentication with role-based access"

# For performance optimization
@seo-engineer "Optimize calendar rendering for mobile devices"

# For user content
@web-copywriter "Create professional UI text for OmniaGroup employees"
```

#### **📚 MCP Research - Use Before Implementation**
```bash
# Research libraries before using them
@context7 search "next.js 15 app router middleware"
@context7 search "drizzle orm with neon database"  
@context7 search "react big calendar best practices"
@context7 search "netlify functions cors configuration"
```

## 🎯 When to Use Each Tool

### **Backend Tasks** → backend-api-specialist
- Designing API endpoints structure
- Implementing authentication flows
- Creating database operations
- Handling error responses
- Configuring CORS and security

### **Frontend Tasks** → frontend-react-specialist
- Creating React components architecture
- Implementing Next.js 15 features
- Setting up Tailwind CSS styling
- Building responsive calendar interface
- Managing client-side state

### **Database Tasks** → database-specialist
- Designing table relationships
- Writing efficient queries
- Creating database migrations
- Optimizing performance
- Setting up connection pooling

### **Security Tasks** → security-auth-specialist
- JWT token management
- Input validation schemas
- Role-based permissions
- Domain restrictions (@ominiaservice.net)
- XSS and injection prevention

### **Performance Tasks** → seo-engineer
- Bundle size optimization
- Loading performance
- Mobile responsiveness
- Accessibility compliance
- Core Web Vitals

### **Content Tasks** → web-copywriter
- UI button text and labels
- Error messages and notifications
- Help text and instructions
- Multi-language content (IT/EN/ES)
- Professional corporate tone

## 📝 Agent Handoff & Documentation Protocol (CRITICAL)

### 🚨 **MANDATORY: Agent Work Documentation**

**PROBLEM**: Claude Code loses context of what agents accomplished during handoff.

**SOLUTION**: Every agent MUST document their work before returning control.

#### **Agent Completion Checklist (MANDATORY)**
When any agent completes their task, they MUST:

1. **Update TASK.md immediately**:
   ```markdown
   ### 1.1 Project Initialization ✅
   **Completed by**: @frontend-react-specialist
   **Date**: 2025-08-07
   **Agent Actions Taken**:
   - Created Next.js 15 project with TypeScript
   - Installed dependencies: tailwindcss, shadcn/ui, drizzle-orm
   - Configured next.config.js for regular deployment (no static export)
   - Setup project structure with app/ directory
   
   **Files Created/Modified**:
   - package.json (dependencies added)
   - next.config.js (configured for Netlify deployment)
   - tailwind.config.ts (OmniaGroup colors configured)
   - tsconfig.json (TypeScript configuration)
   
   **Next Steps**: Ready for database schema setup with @database-specialist
   ```

2. **Create/Update AGENT-WORK-LOG.md**:
   ```markdown
   ## 2025-08-07 - @frontend-react-specialist Work Completed
   
   **Task**: Project Initialization (1.1)
   **Duration**: ~45 minutes
   **Status**: ✅ Completed Successfully
   
   ### Actions Taken:
   1. Researched Next.js 15 best practices with context7
   2. Created project with `npx create-next-app@latest`
   3. Configured TypeScript strict mode
   4. Setup Tailwind CSS with OmniaGroup brand colors
   5. Installed shadcn/ui components
   
   ### Key Decisions Made:
   - Used regular Next.js deployment (avoided static export)
   - Configured app/ directory structure for i18n
   - Setup route groups for (public)/(employee)/(admin)
   
   ### Files Ready for Next Agent:
   - Project structure ready for @database-specialist
   - Environment variables configured for NEON database
   
   ### Validation Completed:
   - `npm run build` successful
   - `npm run dev` starts without errors
   - TypeScript compilation clean
   ```

3. **Leave STATUS-HANDOFF.md note**:
   ```markdown
   # Agent Handoff Status
   
   **From**: @frontend-react-specialist
   **To**: Claude Code (for coordination)
   **Date**: 2025-08-07 15:30
   
   **Work Completed**: Project Initialization (Task 1.1) ✅
   **Ready For**: Database schema setup (Task 1.4)
   **Recommended Next Agent**: @database-specialist
   
   **Current Project State**:
   - Next.js 15 project functional
   - Dependencies installed and configured
   - Ready for database integration
   
   **Important Notes**:
   - Avoided static export per CLAUDE.md rules
   - Multi-domain auth prepared in configuration
   - OmniaGroup branding applied
   ```

#### **Claude Code Response Protocol (MANDATORY)**
When Claude Code regains control after agent work:

1. **IMMEDIATELY read these files**:
   - TASK.md (check for agent updates)
   - AGENT-WORK-LOG.md (understand what was done)
   - STATUS-HANDOFF.md (current state)

2. **Validate agent work**:
   ```bash
   # Check if agent work was successful
   npm run build  # or appropriate validation
   ```

3. **Acknowledge and continue**:
   ```markdown
   **Agent Work Acknowledgment**:
   - ✅ Read @frontend-react-specialist completion documentation
   - ✅ Validated project builds successfully
   - ✅ Confirmed Next.js 15 setup complete
   - ➡️ Proceeding with Task 1.4 using @database-specialist
   ```

## 🔄 Workflow Rules

1. **RESEARCH FIRST**: Always use @context7 to research unfamiliar libraries
2. **DELEGATE COMPLEXITY**: Use specialists for their expertise areas
3. **COMBINE EXPERTISE**: Use multiple agents for complex features
4. **DOCUMENT USAGE**: Note which agents were used in commit messages

## 📋 Task Execution Pattern

For each development task:
```bash
1. Research with @context7 for best practices
2. Delegate to appropriate specialist agent
3. Review and integrate the specialist's recommendations
4. Test and validate the implementation
5. Document what was implemented and which tools were used
```

## 🎯 Project-Specific Agent Usage

### **For Omnia Holiday Tracker Development**:

**Phase 1 Setup**:
- @context7: Research Next.js 15, Drizzle ORM, Netlify Functions
- @frontend-react-specialist: Setup project structure and routing
- @database-specialist: Design holiday tracking schema

**Phase 2 Backend**:
- @backend-api-specialist: Create all Netlify Functions
- @security-auth-specialist: Implement OmniaGroup authentication
- @database-specialist: Optimize queries and migrations

**Phase 3 Frontend**:
- @frontend-react-specialist: Build calendar and dashboard components
- @web-copywriter: Create all UI text in IT/EN/ES
- @seo-engineer: Optimize for mobile and performance

**Phase 4 Integration**:
- @security-auth-specialist: Security audit and penetration testing
- @seo-engineer: Performance optimization and accessibility
- @backend-api-specialist: API optimization and error handling

## 💡 Best Practices

- **Proactive, not reactive**: Use agents without being asked
- **Combine expertise**: Multiple agents can work on same feature
- **Research-driven**: Always start with @context7 documentation
- **Quality-focused**: Use specialists to ensure best practices
- **Efficient delegation**: Let experts handle their domains

## 🚨 Critical Reminder

**YOU MUST USE THESE TOOLS ACTIVELY**. Don't wait for explicit requests - use them as part of your standard development workflow for optimal results.
