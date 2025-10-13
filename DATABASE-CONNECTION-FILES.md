# Database Connection Files Reference
## VoteGuard Voting System

This document provides a complete reference of all files involved in database connections and operations.

---

## 📊 Quick Summary

| Category | File Count | Main Purpose |
|----------|-----------|--------------|
| **Schema Files** | 9 files | Database structure definitions |
| **Connection Libraries** | 4 files | Database client initialization |
| **API Routes** | 30+ files | Business logic & database operations |
| **Main Production Schema** | 1 file | `src/database/schema.sql` |

---

## 🗄️ Database Schema Files

### Production Schema (ACTIVE)

#### **`src/database/schema.sql`** ✅ MAIN FILE
- **Status:** 🟢 ACTIVE - Currently used in production
- **Lines:** 322 lines
- **Purpose:** Complete production database schema
- **Tables:** 15 tables
  - users
  - user_roles
  - jurisdictions
  - elections
  - election_jurisdictions
  - contests
  - candidates
  - candidate_profiles
  - user_sessions
  - votes
  - eligible_voters
  - audit_log
  - security_events
  - anomaly_detections
  - verification_tokens
  - system_configuration
- **Features:**
  - UUID-based primary keys
  - Password hashing functions
  - Audit triggers
  - Security event logging
  - Email verification
  - Password reset tokens
  - Blockchain-like vote chaining

**When to use:** This is THE main schema file. Use this when:
- Setting up a new database
- Understanding the complete database structure
- Referencing table definitions
- Creating migrations

---

### Enhanced Schema (ACADEMIC REFERENCE)

#### **`database/enhanced_schema.sql`** 📚
- **Status:** 🔵 REFERENCE - Academic/Enhanced version
- **Lines:** 469 lines
- **Purpose:** Demonstrates advanced DBMS concepts
- **Additional Features:**
  - Organizations table
  - Enhanced audit logging
  - Stored procedures for election results
  - Database views (active_elections, user_statistics, voting_statistics)
  - Vote encryption fields
  - Complex triggers
  - Performance optimization functions

**When to use:**
- Learning advanced database concepts
- Understanding complex stored procedures
- Exploring reporting views
- Academic project documentation

---

### Supporting Schema Files

#### **`database/simplified-schema.sql`**
- **Purpose:** Minimal database setup for testing
- **Use case:** Quick development environment

#### **`database/quick-setup.sql`**
- **Purpose:** Fast database initialization
- **Use case:** Development/testing

#### **`src/database/password-reset-schema.sql`**
- **Purpose:** Password reset functionality tables
- **Status:** Integrated into main schema

#### **`src/database/otp-schema.sql`**
- **Purpose:** OTP/2FA support tables
- **Status:** Integrated into main schema

#### **`src/database/seed.sql`**
- **Purpose:** Sample data for development
- **Use case:** Testing, demos

---

### Migration/Fix Scripts

#### **`database/fix-status-constraint.sql`**
- **Purpose:** Fix status field constraints
- **Type:** Migration script

#### **`database/simplified-registration-schema.sql`**
- **Purpose:** Registration table updates
- **Type:** Migration script

#### **`database/simplified-registration-migration.sql`**
- **Purpose:** Apply registration changes
- **Type:** Migration script

#### **`database/check-and-fix-admin-roles.sql`**
- **Purpose:** Admin role verification and fixes
- **Type:** Utility script

#### **`database/fix-my-admin-access.sql`**
- **Purpose:** Admin access recovery
- **Type:** Utility script

#### **`database/URGENT-FIX-ADMIN-NOW.sql`**
- **Purpose:** Emergency admin access fix
- **Type:** Utility script

---

## 🔌 Database Connection Library Files

### 1. **`src/lib/supabase.ts`** - Main Database Client

```typescript
import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Exports
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
export const createAdminClient = () => supabaseAdmin;
```

**Purpose:** 
- Initialize Supabase client
- Provide both public and admin clients
- Singleton pattern for connection reuse

**Used by:** Most API routes for database operations

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### 2. **`src/lib/supabase-auth.ts`** - Authentication Service

```typescript
export class SupabaseAuthService {
  public supabaseAdmin;
  
  // Key methods
  async getUserWithRolesByEmail(email: string)
  async verifyPassword(password: string, hash: string)
  async updateLastLogin(userId: string)
  async incrementFailedLoginAttempts(userId: string)
  async logSecurityEvent(event: SecurityEvent)
  async testConnection()
}

export const supabaseAuth = new SupabaseAuthService();
```

**Purpose:**
- Centralized authentication logic
- Password verification (bcrypt)
- Login tracking
- Security event logging
- Failed login attempts management

**Used by:**
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/register/route.ts`
- Any route requiring authentication

**Key Features:**
- Account lockout after 5 failed attempts
- Last login timestamp tracking
- Security event audit trail
- Connection health checks

---

### 3. **`src/lib/auth.ts`** - JWT Verification

```typescript
export function verifyJWT(request: NextRequest) {
  // Extract token from cookie
  // Verify with JWT_SECRET
  // Return decoded user or error
}

export function createJWT(payload: any) {
  // Create JWT token
  // Sign with JWT_SECRET
  // Set expiration
}
```

**Purpose:**
- JWT token creation and verification
- Extract user info from tokens
- Validate authentication on API routes

**Used by:** All protected API routes

**Environment Variables:**
- `JWT_SECRET`

---

### 4. **`src/lib/database.ts`** - Legacy/Compatibility

**Purpose:** 
- Legacy database functions
- Migration compatibility
- Fallback operations

**Status:** Being phased out in favor of direct Supabase client usage

---

### 5. **`src/lib/enhanced-database.ts` & `src/lib/enhanced-database-fixed.ts`**

**Purpose:**
- Enhanced database operations
- Complex query helpers
- May contain experimental features

**Status:** Supplementary, not primary

---

## 🛣️ API Routes by Database Process

### Authentication Routes

#### **`src/app/api/auth/register/route.ts`**
**Database Operations:**
- Check if user exists (`users` SELECT)
- Hash password (bcrypt)
- Insert new user (`users` INSERT)
- Assign default role (`user_roles` INSERT)

**Tables:** users, user_roles

**Connection:** Uses `supabaseAuth.supabaseAdmin`

**Key Queries:**
```typescript
// Check existing user
.from('users').select('email').eq('email', email)

// Create user
.from('users').insert([{ user_id, email, first_name, last_name, password_hash }])

// Assign role
.from('user_roles').insert([{ user_id, role_name: 'Voter' }])
```

---

#### **`src/app/api/auth/login/route.ts`**
**Database Operations:**
- Test connection
- Fetch user by email (`users` SELECT)
- Get user roles (`user_roles` SELECT)
- Verify password (bcrypt compare)
- Update last login (`users` UPDATE)
- Log security event (`security_events` INSERT)
- Create JWT token

**Tables:** users, user_roles, security_events

**Connection:** Uses `supabaseAuth`

**Key Methods:**
```typescript
supabaseAuth.testConnection()
supabaseAuth.getUserWithRolesByEmail(email)
supabaseAuth.verifyPassword(password, hash)
supabaseAuth.updateLastLogin(userId)
supabaseAuth.logSecurityEvent(event)
```

---

### Election Management Routes

#### **`src/app/api/elections/route.ts`**
**Database Operations:**

**GET:**
- Fetch elections list (`elections` SELECT)
- Get eligible voters count (`eligible_voters` COUNT)
- Check user eligibility (`eligible_voters` SELECT)
- Check if user voted (`votes` SELECT)

**POST:**
- Create new election (`elections` INSERT)
- Create contests (`contests` INSERT)
- Create candidates (`candidates` INSERT)

**Tables:** elections, contests, candidates, eligible_voters, votes

**Connection:** Uses `supabaseAdmin`

---

#### **`src/app/api/elections/[id]/route.ts`**
**Database Operations:**
- Fetch single election details (`elections` SELECT)
- Get contests (`contests` SELECT)
- Get candidates (`candidates` SELECT)
- Get voter eligibility (`eligible_voters` SELECT)

**Tables:** elections, contests, candidates, eligible_voters

---

#### **`src/app/api/elections/[id]/contests/route.ts`**
**Database Operations:**
- Fetch contests for election (`contests` SELECT)
- Get candidates for each contest (`candidates` SELECT)

**Tables:** contests, candidates

---

#### **`src/app/api/elections/[id]/results/route.ts`**
**Database Operations:**
- Get election info (`elections` SELECT)
- Get contests (`contests` SELECT)
- Count votes per candidate (`votes` SELECT + GROUP BY)
- Calculate vote percentages (aggregation)
- Get total voter turnout

**Tables:** elections, contests, candidates, votes, eligible_voters

**Key Queries:**
```typescript
// Vote aggregation
.from('votes')
.select('candidate_id, candidates(candidate_name, party)')
.eq('election_id', electionId)
.eq('contest_id', contestId)

// Count and group (done in application layer)
```

---

### Voting Routes

#### **`src/app/api/votes/route.ts`**
**Database Operations:**

**POST (Cast Vote):**
- Verify user is voter (`user_roles` SELECT)
- Check existing vote (`votes` SELECT)
- Verify contest exists (`contests` SELECT)
- Verify candidate (`candidates` SELECT)
- Check election active (`elections` SELECT)
- Generate vote hash (crypto)
- Get previous vote hash (`votes` SELECT)
- Insert vote record (`votes` INSERT)

**GET (Vote History):**
- Fetch user's votes (`votes` SELECT)

**Tables:** votes, contests, candidates, elections, user_roles

**Connection:** Uses both `supabaseAuth.supabaseAdmin` and `database.query()`

---

#### **`src/app/api/elections/[id]/vote/route.ts`**
**Database Operations:**
- Verify election active (`elections` SELECT)
- Check voter eligibility (`eligible_voters` SELECT)
- Check for existing vote (`votes` SELECT)
- Fetch contests (`contests` SELECT)
- Validate candidate (`candidates` SELECT)
- Insert vote with hash (`votes` INSERT)
- Update voter status (`eligible_voters` UPDATE)

**Tables:** elections, eligible_voters, votes, contests, candidates

**Blockchain Feature:**
```typescript
// Vote chaining for integrity
const voteHash = crypto
  .createHash('sha256')
  .update(`${electionId}-${voterId}-${candidateId}-${timestamp}`)
  .digest('hex');

// Link to previous vote
previous_vote_hash: lastVote?.vote_hash || null
```

---

### Admin Routes

#### **`src/app/api/admin/users/route.ts`**
**Database Operations:**
- List all users with roles (`users` + `user_roles` JOIN)
- Update user status (`users` UPDATE)
- Assign/revoke roles (`user_roles` INSERT/DELETE)

**Tables:** users, user_roles

---

#### **`src/app/api/admin/elections/route.ts`**
**Database Operations:**
- Manage election lifecycle
- Update election status (`elections` UPDATE)
- Delete elections (`elections` DELETE)

**Tables:** elections

---

#### **`src/app/api/admin/audit/route.ts`**
**Database Operations:**
- Fetch audit logs (`audit_log` SELECT)
- Filter by user, action, date
- Pagination

**Tables:** audit_log

---

#### **`src/app/api/admin/security/route.ts`**
**Database Operations:**
- Fetch security events (`security_events` SELECT)
- Get anomaly detections (`anomaly_detections` SELECT)
- Review suspicious activities

**Tables:** security_events, anomaly_detections

---

### Dashboard Routes

#### **`src/app/api/dashboard/route.ts`**
**Database Operations:**
- Get user's elections (`elections` + `eligible_voters` JOIN)
- Get active elections count
- Get vote statistics
- Get upcoming elections

**Tables:** elections, eligible_voters, votes

---

## 🗂️ Complete File Structure

```
voting-system/
├── database/                              # Schema files
│   ├── enhanced_schema.sql                # ⭐ Academic reference
│   ├── simplified-schema.sql              # Minimal setup
│   ├── quick-setup.sql                    # Quick dev setup
│   ├── fix-status-constraint.sql          # Migration
│   ├── simplified-registration-schema.sql # Migration
│   ├── simplified-registration-migration.sql
│   ├── check-and-fix-admin-roles.sql      # Utility
│   ├── fix-my-admin-access.sql            # Utility
│   └── URGENT-FIX-ADMIN-NOW.sql           # Utility
│
├── src/
│   ├── database/                          # Production schemas
│   │   ├── schema.sql                     # ⭐⭐⭐ MAIN SCHEMA
│   │   ├── seed.sql                       # Sample data
│   │   ├── password-reset-schema.sql      # Integrated
│   │   └── otp-schema.sql                 # Integrated
│   │
│   ├── lib/                               # Database connections
│   │   ├── supabase.ts                    # ⭐ Main client
│   │   ├── supabase-auth.ts               # ⭐ Auth service
│   │   ├── auth.ts                        # ⭐ JWT verification
│   │   ├── database.ts                    # Legacy
│   │   ├── enhanced-database.ts           # Enhanced ops
│   │   └── enhanced-database-fixed.ts     # Enhanced ops
│   │
│   └── app/api/                           # API routes (database ops)
│       ├── auth/
│       │   ├── register/route.ts          # User registration
│       │   └── login/route.ts             # User login
│       ├── elections/
│       │   ├── route.ts                   # List/create elections
│       │   └── [id]/
│       │       ├── route.ts               # Election details
│       │       ├── vote/route.ts          # Cast vote
│       │       ├── contests/route.ts      # Get contests
│       │       └── results/route.ts       # Election results
│       ├── votes/
│       │   └── route.ts                   # Vote operations
│       ├── admin/
│       │   ├── users/route.ts             # User management
│       │   ├── elections/route.ts         # Election management
│       │   ├── audit/route.ts             # Audit logs
│       │   └── security/route.ts          # Security events
│       └── dashboard/
│           └── route.ts                   # Dashboard data
```

---

## 🔑 Environment Variables Required

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-min-32-chars

# Optional
DATABASE_URL=postgresql://...  # If using direct connection
```

---

## 📋 Database Connection Checklist

### For New Setup:
1. ✅ Run `src/database/schema.sql` on Supabase
2. ✅ Set environment variables
3. ✅ Test connection: `supabaseAuth.testConnection()`
4. ✅ Create first admin user
5. ✅ Verify all tables created

### For Development:
1. Use `database/quick-setup.sql` for fast setup
2. Run `src/database/seed.sql` for sample data
3. Test with sample users and elections

### For Production:
1. Use `src/database/schema.sql` (main file)
2. Enable Row Level Security (RLS) if needed
3. Set up database backups
4. Monitor audit logs

---

## 🎯 Quick Reference by Use Case

### "I need to understand the database structure"
→ Read: `src/database/schema.sql`

### "I need to query users"
→ Use: `supabaseAuth.supabaseAdmin.from('users')`

### "I need to authenticate a user"
→ Use: `supabaseAuth.getUserWithRolesByEmail()`

### "I need to create an election"
→ See: `src/app/api/elections/route.ts` (POST method)

### "I need to cast a vote"
→ See: `src/app/api/elections/[id]/vote/route.ts`

### "I need to get election results"
→ See: `src/app/api/elections/[id]/results/route.ts`

### "I need to manage users"
→ See: `src/app/api/admin/users/route.ts`

### "I need to see audit logs"
→ Query: `audit_log` table or use `src/app/api/admin/audit/route.ts`

---

## 📊 Database Operation Statistics

| Operation Type | Frequency | Primary Tables |
|----------------|-----------|----------------|
| User Authentication | High | users, user_roles |
| Vote Casting | High | votes, eligible_voters |
| Election Queries | Medium | elections, contests |
| Result Aggregation | Low | votes, candidates |
| Admin Operations | Low | users, elections, audit_log |
| Security Logging | High | security_events, audit_log |

---

## 🚀 Performance Tips

1. **Always use indexes** for frequently queried fields (email, election_id, voter_id)
2. **Use `.select()` with specific columns** instead of `SELECT *`
3. **Implement pagination** with `.range()` for large datasets
4. **Cache election results** - they don't change until election ends
5. **Use `.single()` or `.maybeSingle()`** when expecting one result
6. **Batch operations** when possible (bulk inserts)

---

**Last Updated:** October 8, 2025
**Main Schema File:** `src/database/schema.sql` ⭐⭐⭐
**Project:** VoteGuard Voting System
