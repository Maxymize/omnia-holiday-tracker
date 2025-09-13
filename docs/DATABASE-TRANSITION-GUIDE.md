# Database Transition Guide
## From Mock Storage to Production Database

This guide documents the complete transition from file-based mock storage to a production-ready PostgreSQL database with Drizzle ORM.

## 🎯 Overview

The Omnia Holiday Tracker has been fully transitioned from mock storage to a robust database system with:

- **PostgreSQL Database** with Neon serverless hosting
- **Drizzle ORM** for type-safe database operations
- **Comprehensive Audit Logging** for GDPR compliance
- **Migration System** for schema versioning
- **Production-Ready Performance** optimized for serverless functions

## 📋 Completed Components

### 1. Database Schema (`/lib/db/schema.ts`)
- **Users Table**: Employee accounts with role-based access
- **Departments Table**: Organizational structure
- **Holidays Table**: Holiday requests with full workflow tracking
- **Settings Table**: System configuration with audit trails
- **Audit Logs Table**: GDPR compliance logging

### 2. Database Operations (`/lib/db/operations.ts`)
- **Mock Storage Compatibility**: All functions maintain exact API compatibility
- **Audit Logging**: Comprehensive tracking of all admin actions
- **Connection Pooling**: Optimized for serverless cold starts
- **Error Handling**: Robust error recovery and logging

### 3. Migration System (`/lib/db/migrate.ts`)
- **Schema Versioning**: Track and apply database changes
- **Rollback Support**: Safe migration reversal
- **Seeding**: Initial data population for development

### 4. Updated Netlify Functions
All functions now use database operations while maintaining full API compatibility:

- ✅ `create-holiday-request.ts` - Creates holidays with audit logging
- ✅ `approve-reject-holiday.ts` - Updates status with admin audit trails
- ✅ `get-holidays.ts` - Already using database with advanced filtering
- ✅ `get-employees-mock.ts` - Now pulls from database with holiday statistics
- ✅ `admin-approve-employee.ts` - Employee approval with audit logging
- ✅ `get-settings-mock.ts` - Database-backed settings with fallbacks
- ✅ `update-settings.ts` - Settings management with comprehensive auditing

## 🚀 Setup Instructions

### Prerequisites
```bash
# Ensure DATABASE_URL is configured
echo $DATABASE_URL
# Should show: postgres://user:password@host:5432/database
```

### Database Initialization
```bash
# Install dependencies (if not already done)
npm install

# Initialize database and run migrations
npm run db:init

# Check migration status
npm run db:migrate:status

# Run individual migrations if needed
npm run db:migrate:up
```

### Environment Configuration
Ensure your `.env` file contains:
```env
# Required: Database connection
DATABASE_URL=postgres://user:password@host:5432/database

# Required: JWT secret for authentication
JWT_SECRET=your-secret-key-here

# Required: Admin email
ADMIN_EMAIL=max.giurastante@omniaservices.net

# Required: Allowed domains
ALLOWED_EMAIL_DOMAINS=omniaservices.net,omniaelectronics.com
```

## 🧪 Testing Instructions

### 1. API Compatibility Testing
All existing API endpoints should work identically:

```bash
# Test holiday creation
curl -X POST http://localhost:8888/.netlify/functions/create-holiday-request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2025-08-15","endDate":"2025-08-17","type":"vacation","notes":"Test"}'

# Test holiday approval (admin only)
curl -X POST http://localhost:8888/.netlify/functions/approve-reject-holiday \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"holidayId":"HOLIDAY_ID","action":"approve","notes":"Approved"}'

# Test getting holidays
curl -X GET "http://localhost:8888/.netlify/functions/get-holidays?viewMode=all" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test getting employees (admin only)
curl -X GET http://localhost:8888/.netlify/functions/get-employees-mock \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"

# Test settings
curl -X GET http://localhost:8888/.netlify/functions/get-settings-mock \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Performance Validation
Target: All database operations should complete within 100ms

```bash
# Check query performance
npm run db:studio
# Use Drizzle Studio to inspect query execution times
```

### 3. Audit Logging Validation
Verify all admin actions are properly logged:

```sql
-- Check recent audit logs
SELECT * FROM audit_logs 
ORDER BY timestamp DESC 
LIMIT 10;

-- Check specific action types
SELECT action, COUNT(*) 
FROM audit_logs 
GROUP BY action;
```

## 🔧 Database Management

### Migration Commands
```bash
# Check migration status
npm run db:migrate:status

# Run pending migrations
npm run db:migrate:up

# Rollback last migration (use with caution)
npm run db:migrate:down

# Reset database (development only)
npm run db:reset
```

### Development Tools
```bash
# Open Drizzle Studio for database inspection
npm run db:studio

# Generate new migrations after schema changes
npm run db:generate

# Push schema changes (development only)
npm run db:push
```

## 📊 GDPR Compliance Features

### Audit Logging
All administrative actions are automatically logged:
- Holiday approvals/rejections
- Employee status changes
- System settings modifications
- User account creation
- Data access patterns

### Data Retention
- Audit logs are retained indefinitely for compliance
- Medical certificates (when implemented) follow configured retention period
- User data can be anonymized upon request

### Data Portability
- Full data export capabilities through admin interface
- Structured export formats for compliance requests

## 🚨 Important Notes

### Migration Safety
- **Always backup** production database before migrations
- **Test migrations** in staging environment first
- **Monitor performance** after schema changes

### Connection Management
- Database connections are optimized for serverless
- Connection pooling prevents timeout issues
- Automatic retry logic handles temporary failures

### Backwards Compatibility
- All mock storage functions maintain exact same APIs
- Frontend code requires no changes
- Gradual migration path available if needed

## 📈 Performance Optimizations

### Database Indexes
Strategic indexes for common query patterns:
- User email lookups
- Holiday date range queries
- Department-based filtering
- Status-based filtering

### Query Optimization
- Join optimization for holiday-user-department queries
- Pagination support for large datasets
- Efficient counting queries for statistics

### Serverless Optimization
- Optimized connection handling
- Minimal cold start impact
- Efficient query batching

## 🔍 Troubleshooting

### Common Issues

**Connection Errors**
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL
# Should be: postgres://user:password@host:5432/database
```

**Migration Failures**
```bash
# Check migration status
npm run db:migrate:status

# View detailed migration logs
npm run db:migrate:up --verbose
```

**Performance Issues**
```bash
# Open database studio to inspect queries
npm run db:studio

# Check connection pooling
# Verify serverless function timeout settings
```

### Support Contacts
- Database Issues: max.giurastante@omniaservices.net
- System Administration: max.giurastante@omniaservices.net

---

## 🎉 Success Criteria

The database transition is complete when:
- ✅ All migrations run successfully
- ✅ All API endpoints return expected responses
- ✅ Performance targets are met (<100ms for database operations)
- ✅ Audit logging captures all admin actions
- ✅ GDPR compliance features are operational
- ✅ Frontend application works without modifications

**Status: READY FOR PRODUCTION** 🚀