# Omnia Holiday Tracker - Task Management (ACTIVE TASKS ONLY)

## 🚨 CONTEXT OPTIMIZATION
**This file now contains ONLY active tasks to preserve Claude Code context.**
**Completed tasks have been archived to TASK-COMPLETED.md**

## 🤖 AI Tools Usage Guidelines

### **MANDATORY: Use Specialized Agents & MCP Tools**

**Available Agents**:
- **backend-api-specialist**: Netlify Functions, APIs, server logic
- **frontend-react-specialist**: React components, Next.js, UI  
- **database-specialist**: Drizzle ORM, schemas, migrations
- **security-auth-specialist**: JWT, authentication, security
- **seo-engineer**: Performance, accessibility, SEO
- **web-copywriter**: UI text, messages, content

**MCP Servers**: context7, others via list command

### **🔄 Agent Handoff Protocol (CRITICAL)**
1. ✅ Agent updates TASK.md, AGENT-WORK-LOG.md, STATUS-HANDOFF.md
2. 📖 Claude Code reads documentation immediately 
3. ✅ Validates agent work before continuing
4. ➡️ Plans next steps based on documentation

---

## 📋 Task Status Legend
- ⏳ **Pending**: Not started
- 🔄 **In Progress**: Currently being worked on  
- ✅ **Ready for Review**: Completed, needs validation
- 🎯 **Active Focus**: Current priority task

---

## 🚀 PHASE 5: Flexible Leave Type System (ACTIVE - Multi-Country Support)

### 5.1 Database Schema Update for Flexible Leave Allowances ✅
**Priority**: High | **Est**: 2 hours | **Status**: COMPLETED
- [x] ~~Update users table with separate allowance fields~~ **REVISED - Used system settings instead**
- [x] Add system-wide settings for default allowances per leave type
- [x] Keep users.holidayAllowance for backward compatibility
- [x] Create migration for new system settings
- [x] Test schema changes with existing data

### 5.2 Admin Settings for Leave Type Configuration ✅
**Priority**: High | **Est**: 3 hours | **Status**: COMPLETED
- [x] Add admin settings interface for configurable allowances:
  - [x] Vacation/Ferie days (default: 20/year)
  - [x] Personal/Permessi days (default: 10/year)  
  - [x] Sick/Malattie days (default: unlimited with documentation)
- [x] Create comprehensive React component with form validation
- [x] Add validation for reasonable allowance values
- [x] Integrate with existing get-settings and update-settings API endpoints
- [x] Added Italian language support and intuitive UI/UX
- [x] Integrated into admin dashboard settings tab

### 5.3 Backend API Updates for Separate Leave Type Tracking ✅
**Priority**: High | **Est**: 3 hours | **Status**: COMPLETED
- [x] Update get-holidays function for separate calculations per type
- [x] Modify useHolidays hook for separate tracking and statistics
- [x] Implement flexible calculations based on admin-configured allowances
- [x] Update all holiday-related APIs to support separate leave types

### 5.4 Frontend Dashboard Updates for Multi-Type Display ✅
**Priority**: High | **Est**: 4 hours | **Status**: COMPLETED  
- [x] Create separate widgets for Vacation, Personal, and Sick leave
- [x] Update HolidayBalance component with configurable counters
- [x] Update admin personal dashboard with separate stats
- [x] Add multi-language support for leave type labels (IT/EN/ES)
- [x] Display admin-configured allowances in UI

---

## 🧪 PHASE 6: Testing & Quality Assurance (FUTURE)

### 6.1 Testing Suite Setup ⏳
**Priority**: High | **Est**: 6 hours | **Status**: Pending
- [ ] Vitest unit testing setup
- [ ] Component testing with React Testing Library
- [ ] E2E testing with Playwright

### 6.2 Security & Performance ⏳
**Priority**: High | **Est**: 4 hours | **Status**: Pending
- [ ] Security audit of API endpoints
- [ ] Performance optimization
- [ ] Accessibility compliance testing

---

## 🚀 PHASE 7: Deployment (FUTURE)

### 7.1 Production Environment ⏳
**Priority**: High | **Est**: 2 hours | **Status**: Pending
- [ ] Final production deployment
- [ ] Environment variables configuration  
- [ ] **CRITICAL**: Enable cookie authentication by removing dev bypass in middleware
- [ ] Monitoring setup

### 7.2 Cookie Authentication Production Switch 🍪
**Priority**: CRITICAL for Production | **Status**: Ready to Enable
**File**: `middleware.ts:110-113`
- [x] Cookie system fully implemented (login-test.ts sets HTTP-only cookies)
- [x] JWT validation ready (getUserFromToken function complete)
- [x] Security headers configured
- [ ] **ACTION REQUIRED**: Remove dev bypass when deploying
- [ ] Test cookie authentication in production environment
- [ ] Verify middleware reads cookies correctly on live server

---

## 📊 Current Progress Summary
**Total Active Tasks**: 6 active tasks in Phase 6-7 (Phase 5 COMPLETED)
**Current Focus**: 🧪 Phase 6 - Testing & Quality Assurance
**Next Phase**: Production Deployment
**Production Ready**: ✅ Database + Admin Panel + Authentication + Flexible Leave System - Core system operational

---

**Latest Completed Work** (Version 1.9.9 - MOBILE UX + CRITICAL BUG FIXES):
- ✅ **Mobile Sidebar Scrolling**: Fixed mobile sidebar scroll functionality, users can now reach all navigation items including logout
- ✅ **Mobile Text Overflow**: Resolved text overflow issues in admin "Le Mie Richieste" header and mobile dialog responsiveness  
- ✅ **Dialog Close Button**: Redesigned dialog X button from boxed to clean modern style without background shapes
- ✅ **Mobile Tab Navigation**: Implemented scrollable horizontal tabs for mobile admin interface with improved readability
- ✅ **Infinite Loop Critical Fix**: Eliminated infinite "Verifica conflitti..." messages in holiday request creation
- ✅ **Medical Certificate Bug**: Fixed "Dati non validi" error when selecting "send certificate later" option for sick leave
- ✅ **Zod Validation**: Updated backend schema to accept null values for medicalCertificateFileName properly
- ✅ **Admin Sidebar Cleanup**: Removed unnecessary "Statistiche Rapide" section for cleaner navigation experience
- ✅ **Mobile Responsive Design**: Complete mobile optimization across all dialog boxes, headers, and navigation elements

**For detailed task history and completed work, see TASK-COMPLETED.md**
