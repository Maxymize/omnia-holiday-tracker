# 🏖️ Omnia Holiday Tracker

**Internal Employee Holiday Management System for OmniaGroup**

A modern, mobile-first SaaS application for managing employee holiday requests, approvals, and calendar visualization built specifically for OmniaGroup's internal use.

## 🌟 Features

### For Employees
- 📅 **Calendar-First Interface** - Intuitive monthly calendar view with color-coded holidays
- ✈️ **Quick Holiday Requests** - One-click holiday requests directly from calendar
- 📱 **Mobile Optimized** - Touch-friendly interface for on-the-go requests
- 🌍 **Multi-Language** - Full support for Italian, English, and Spanish
- 📊 **Personal Dashboard** - Track holiday balance, request status, and history
- 👥 **Team Visibility** - View team holidays (if enabled by admin)

### For Administrators
- ✅ **Employee Management** - Approve new registrations, manage employee data
- 🏢 **Department Structure** - Create departments, assign employees, manage policies
- ⚙️ **System Configuration** - Control visibility settings and approval workflows
- 📈 **Analytics Dashboard** - Holiday usage statistics and reporting
- 🔧 **Bulk Operations** - Approve/reject multiple requests efficiently
- 📤 **Export Capabilities** - Generate reports for HR and compliance

## 🏗️ Architecture

**Frontend**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui  
**Backend**: Netlify Functions (serverless)  
**Database**: Neon PostgreSQL + Drizzle ORM  
**Authentication**: Custom JWT with domain validation  
**Deployment**: Netlify with automatic deployments  
**Calendar**: React Big Calendar with custom optimizations  

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Netlify CLI
- Neon PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/ominiagroup/omnia-holiday-tracker.git
cd omnia-holiday-tracker

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Setup database
npm run db:push
npm run db:migrate

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🌍 Internationalization

The application supports three languages:
- **Italian (IT)** - Primary language for OmniaGroup Italy
- **English (EN)** - For international employees  
- **Spanish (ES)** - For Spanish-speaking employees

Language is automatically detected from browser preferences and can be manually switched using the language selector.

## 🔐 Authentication & Security

- **Domain Restriction**: Only `@ominiaservice.net` email addresses can register
- **Admin Access**: `max.giurastante@ominiaservice.net` has super admin privileges
- **Role-Based Access**: Clear separation between employee and admin capabilities
- **JWT Security**: Secure token-based authentication with proper expiration
- **Audit Logging**: All admin actions and approvals are logged for compliance

## 📊 Database Schema

### Core Tables
- **users** - Employee accounts with department assignments
- **departments** - Company departments with managers and policies
- **holidays** - Holiday requests with status tracking
- **settings** - System configuration (visibility, approval modes)

### Relationships
- Users belong to Departments (many-to-one)
- Holidays belong to Users (many-to-one)
- Settings track admin changes with audit trail

## 🎨 Design System

### Brand Colors (OmniaGroup)
- **Primary**: Blue (#1e40af) - Brand color, navigation
- **Success**: Emerald (#059669) - Approved requests
- **Warning**: Amber (#d97706) - Pending requests
- **Error**: Red (#ef4444) - Rejected requests

### Components
- Built on shadcn/ui foundation
- Custom calendar components for holiday visualization
- Mobile-first responsive design
- Professional corporate styling

## 🔧 Development

### Project Structure
```
├── app/                    # Next.js 15 App Router
│   ├── (public)/          # Public pages (login)
│   ├── (employee)/        # Employee dashboard
│   └── (admin)/           # Admin management
├── components/            # Reusable UI components
├── lib/                   # Utilities and database
├── netlify/functions/     # Serverless backend
└── drizzle/              # Database schema and migrations
```

### Key Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run test suite
npm run db:push      # Push schema changes
npm run db:migrate   # Run database migrations
npm run deploy       # Deploy to production
```

### Testing
- **Unit Tests**: Vitest for functions and utilities
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright for critical workflows
- **Coverage Target**: >80% for all critical paths

## 📋 Environment Variables

```bash
# Database
DATABASE_URL=your_neon_database_url

# Authentication
JWT_SECRET=your_jwt_secret_key

# Optional Integrations
RESEND_API_KEY=your_resend_key_for_emails
```

## 🚀 Deployment

### Netlify Deployment
1. Connect your GitHub repository to Netlify
2. Configure environment variables in Netlify dashboard
3. Set build command: `npm run build`
4. Set publish directory: `.next`
5. Deploy automatically on main branch pushes

### Database Setup
1. Create Neon PostgreSQL database
2. Configure connection string in environment
3. Run migrations: `npm run db:migrate`
4. Create admin account for max.giurastante@ominiaservice.net

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Development guidelines and architecture rules
- **[PLANNING.md](./PLANNING.md)** - Complete project architecture and design system
- **[TASK.md](./TASK.md)** - Development phases and task management
- **[INITIAL.md](./INITIAL.md)** - Quick reference and project overview

## 🎯 Business Logic

### Holiday Request Workflow
1. **Employee Registration** → Admin approval required
2. **Holiday Request** → Date validation and conflict checking
3. **Admin Review** → Approve/reject with notifications
4. **Calendar Update** → Real-time status updates
5. **Compliance Tracking** → Audit trail for HR reporting

### System Configuration
- **Visibility Mode**: All employees see all holidays vs admin-only visibility
- **Approval Mode**: Automatic approval vs manual admin approval
- **Department Settings**: Department-based visibility and policies

## 🔍 Monitoring & Analytics

- **Usage Tracking**: Employee engagement and request patterns
- **Performance Monitoring**: Calendar loading times and API response
- **Error Tracking**: Automated error logging and alerts
- **Business Metrics**: Holiday utilization and approval efficiency

## 🤝 Contributing

This is an internal OmniaGroup project. For development questions or issues:

1. Check existing documentation in the `/docs` folder
2. Review TASK.md for current development status
3. Follow the established coding patterns and architecture
4. Ensure all tests pass before committing
5. Update documentation for any architectural changes

## 📄 License

Internal OmniaGroup project - All rights reserved.

## 📞 Support

For technical issues or questions:
- **Primary Admin**: max.giurastante@ominiaservice.net
- **Development Team**: Internal OmniaGroup developers
- **Documentation**: Check CLAUDE.md for detailed development guidelines

---

**Built with ❤️ for OmniaGroup employees**

*Streamlining holiday management with modern technology and user-centric design.*
