# 🚀 Azure Database Migration & Deployment Guide

## Overview
This guide walks you through migrating VoteGuard from Supabase to Azure Database for PostgreSQL and deploying the enhanced Database Management System project.

## 📋 Prerequisites
- Azure subscription with appropriate permissions
- GitHub repository with Azure deployment workflow
- Supabase project (source for migration)
- Azure CLI installed locally

## 🗄️ Step 1: Create Azure Database for PostgreSQL

### 1.1 Create Resource Group
```bash
az group create --name voteguard-db-rg --location "East US"
```

### 1.2 Create PostgreSQL Flexible Server
```bash
az postgres flexible-server create \
  --resource-group voteguard-db-rg \
  --name voteguard-db-server \
  --location "East US" \
  --admin-user voteguard_admin \
  --admin-password "VoteGuard2024!" \
  --version 15 \
  --sku-name Standard_B1ms \
  --storage-size 32 \
  --tier Burstable \
  --public-access 0.0.0.0
```

### 1.3 Create Database
```bash
az postgres flexible-server db create \
  --resource-group voteguard-db-rg \
  --server-name voteguard-db-server \
  --database-name voteguard_db
```

### 1.4 Configure Firewall (Allow Azure Services)
```bash
az postgres flexible-server firewall-rule create \
  --resource-group voteguard-db-rg \
  --name voteguard-db-server \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 1.5 Install Required Extensions
```bash
# Connect to database and run:
# CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
# CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## 🔧 Step 2: Configure Environment Variables

### 2.1 Update Azure App Service Environment Variables
Go to Azure Portal → App Services → voteguard-webapp-7388 → Configuration → Application settings

Add the following environment variables:
```
AZURE_DATABASE_URL=postgresql://voteguard_admin:VoteGuard2024!@voteguard-db-server.postgres.database.azure.com:5432/voteguard_db?sslmode=require
DATABASE_URL=postgresql://voteguard_admin:VoteGuard2024!@voteguard-db-server.postgres.database.azure.com:5432/voteguard_db?sslmode=require
DB_HOST=voteguard-db-server.postgres.database.azure.com
DB_NAME=voteguard_db
DB_USER=voteguard_admin
DB_PASS=VoteGuard2024!
DB_PORT=5432
DB_SSL=require
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
JWT_SECRET=voteguard_azure_jwt_secret_2024_secure_key
NODE_ENV=production
ENABLE_AUDIT_LOGGING=true
ENABLE_SECURITY_MONITORING=true
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30
ENABLE_QUERY_METRICS=true
SLOW_QUERY_THRESHOLD=1000
```

### 2.2 Update GitHub Secrets
Go to GitHub Repository → Settings → Secrets and variables → Actions

Add/Update these secrets:
```
AZURE_DATABASE_URL=postgresql://voteguard_admin:VoteGuard2024!@voteguard-db-server.postgres.database.azure.com:5432/voteguard_db?sslmode=require
```

## 🔄 Step 3: Run Migration

### 3.1 Local Migration Test (Optional)
```bash
# Copy environment variables
cp .env.azure .env.local

# Install dependencies
npm install

# Run migration
node azure-migration.js
```

### 3.2 Production Migration via GitHub Actions
1. Push any changes to the main branch
2. GitHub Actions will automatically:
   - Deploy the application to Azure
   - Run the Azure Database migration
   - Apply the enhanced schema
   - Migrate data from Supabase

## 🧪 Step 4: Verify Migration

### 4.1 Check Database Schema
Connect to Azure Database and verify:
```sql
-- Check tables
\dt

-- Check stored procedures
\df

-- Check views
\dv

-- Check indexes
\di

-- Verify sample data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM elections;
SELECT COUNT(*) FROM audit_logs;
```

### 4.2 Test Application Endpoints
- Login: https://voteguard-webapp-7388.azurewebsites.net/login
- Dashboard: https://voteguard-webapp-7388.azurewebsites.net/dashboard
- Admin: https://voteguard-webapp-7388.azurewebsites.net/admin

### 4.3 Verify Enhanced Features
- Audit logging is working
- Security monitoring is active
- Performance metrics are collected
- Role-based access control is functional

## 📊 Step 5: Database Management System Features

### 5.1 Performance Monitoring
```sql
-- Check query performance
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;

-- Monitor connection usage
SELECT * FROM pg_stat_activity;
```

### 5.2 Security Auditing
```sql
-- Review security events
SELECT * FROM security_events ORDER BY created_at DESC LIMIT 20;

-- Check audit logs
SELECT * FROM audit_logs WHERE action = 'LOGIN_FAILED' ORDER BY created_at DESC;
```

### 5.3 Database Statistics
```sql
-- Election statistics
SELECT * FROM election_statistics;

-- User activity summary
SELECT role, COUNT(*) as user_count FROM users GROUP BY role;
```

## 🔒 Step 6: Security Hardening

### 6.1 Network Security
- Enable Azure Database firewall rules to restrict access
- Use VNet integration if needed
- Enable SSL/TLS encryption (already configured)

### 6.2 Authentication & Authorization
- Strong passwords implemented (12+ characters)
- Role-based access control (RBAC) active
- Account lockout after failed attempts
- Session management with JWT tokens

### 6.3 Data Protection
- Audit logging for all critical operations
- Encrypted password storage using bcrypt
- Vote encryption and integrity verification
- Comprehensive security event monitoring

## 📈 Step 7: Performance Optimization

### 7.1 Database Indexes
Enhanced schema includes strategic indexes:
- `idx_users_email` - Fast user lookup
- `idx_elections_status_dates` - Election filtering
- `idx_votes_election_user` - Vote verification
- `idx_audit_logs_timestamp` - Audit queries

### 7.2 Connection Pooling
- Minimum connections: 2
- Maximum connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds

### 7.3 Query Monitoring
- Slow query logging (>1000ms)
- Query performance metrics
- Connection pool monitoring
- Database statistics collection

## 🎓 Academic Features Highlights

### Database Management System Concepts Demonstrated:
1. **Data Modeling**: Comprehensive ER model with proper normalization (3NF)
2. **ACID Properties**: Transaction management with rollback capabilities
3. **Concurrency Control**: Connection pooling and lock management
4. **Security**: RBAC, audit trails, encryption, access controls
5. **Performance**: Strategic indexing, query optimization, monitoring
6. **Integrity**: Constraints, triggers, data validation
7. **Scalability**: Connection pooling, efficient queries, proper architecture
8. **Backup & Recovery**: Migration scripts with rollback mechanisms

## 🚨 Troubleshooting

### Common Issues:
1. **Connection Timeout**: Check firewall rules and network connectivity
2. **Authentication Failed**: Verify credentials and connection string
3. **Migration Errors**: Check Supabase source data and Azure target schema
4. **Performance Issues**: Monitor connection pool and query performance

### Debug Commands:
```bash
# Test database connection
node -e "console.log('Testing connection...'); require('./src/lib/enhanced-database.ts').testConnection();"

# Check migration status
node azure-migration.js --check-status

# View application logs
az webapp log tail --name voteguard-webapp-7388 --resource-group voteguard-rg
```

## ✅ Success Criteria

Migration is successful when:
- [ ] Azure Database server is created and accessible
- [ ] Enhanced schema is deployed with all tables, procedures, views
- [ ] Data is migrated from Supabase to Azure Database
- [ ] Application connects successfully to Azure Database
- [ ] All authentication and voting features work
- [ ] Audit logging and security monitoring are active
- [ ] Performance metrics are being collected
- [ ] Admin dashboard shows database statistics

## 📚 Next Steps

After successful migration:
1. **Performance Tuning**: Monitor and optimize slow queries
2. **Security Review**: Regular security audits and penetration testing
3. **Backup Strategy**: Implement automated backup and disaster recovery
4. **Scaling**: Plan for horizontal/vertical scaling based on usage
5. **Monitoring**: Set up alerts for critical database metrics
6. **Documentation**: Maintain updated technical documentation

---

## 🎯 Academic Project Value

This enhanced VoteGuard system demonstrates:
- **Enterprise-grade database architecture**
- **Advanced security implementations**
- **Performance optimization techniques**
- **Comprehensive audit and monitoring**
- **Scalable cloud deployment**
- **Professional documentation**

Perfect for Database Management System course evaluation! 🌟