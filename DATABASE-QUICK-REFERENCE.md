# 🎯 Quick Reference: Database Files Summary
## VoteGuard Voting System

---

## ⭐ MOST IMPORTANT FILES

### 1. **MAIN SQL SCHEMA FILE** (Production)

```
📁 Location: src/database/schema.sql
📊 Status: ACTIVE - Currently in use
📏 Size: 322 lines
🎯 Purpose: Complete production database schema
```

**This is THE main SQL file that contains all the SQL code used in the project.**

#### What's Inside:
- ✅ 15 database tables
- ✅ Indexes for performance
- ✅ Triggers for automation
- ✅ Password hashing functions
- ✅ Audit logging
- ✅ Security constraints
- ✅ Foreign key relationships

#### Tables:
1. `users` - User accounts
2. `user_roles` - Role assignments
3. `elections` - Election definitions
4. `contests` - Voting contests
5. `candidates` - Candidate information
6. `votes` - Vote records (blockchain-like)
7. `eligible_voters` - Voter eligibility
8. `audit_log` - System audit trail
9. `security_events` - Security logging
10. `user_sessions` - Active sessions
11. `jurisdictions` - Geographic boundaries
12. `election_jurisdictions` - Election scope
13. `candidate_profiles` - Extended candidate info
14. `anomaly_detections` - AI anomaly detection
15. `verification_tokens` - Email/password tokens

---

### 2. **ENHANCED SCHEMA FILE** (Academic Reference)

```
📁 Location: database/enhanced_schema.sql
📊 Status: REFERENCE - For learning
📏 Size: 469 lines
🎯 Purpose: Demonstrates advanced DBMS concepts
```

**Use this for academic purposes and understanding advanced database features.**

#### Additional Features:
- ✅ Organizations table
- ✅ Stored procedures (election results calculation)
- ✅ Database views (reporting)
- ✅ Complex triggers
- ✅ Vote encryption
- ✅ More comprehensive audit system

---

## 🔌 DATABASE CONNECTION FILES

### Main Connection Layer

#### **`src/lib/supabase.ts`** - Primary Database Client
```typescript
// Creates connection to Supabase PostgreSQL
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```
**Used by:** All database operations

---

#### **`src/lib/supabase-auth.ts`** - Authentication Service
```typescript
// Handles user authentication & security
export const supabaseAuth = new SupabaseAuthService();
```
**Methods:**
- `getUserWithRolesByEmail()` - Fetch user with roles
- `verifyPassword()` - Check password
- `updateLastLogin()` - Track login time
- `logSecurityEvent()` - Security audit

**Used by:** Login, registration, authentication

---

#### **`src/lib/auth.ts`** - JWT Token Verification
```typescript
// Verifies JWT tokens on API requests
export function verifyJWT(request: NextRequest)
```
**Used by:** All protected API routes

---

## 🗂️ DATABASE OPERATIONS BY PROCESS

### 1. **Creating an Account (Registration)**

**File:** `src/app/api/auth/register/route.ts`

**Database Operations:**
1. Check if email exists → `users` table
2. Hash password → bcrypt
3. Insert new user → `users` table
4. Assign "Voter" role → `user_roles` table

**Connection Used:** `supabaseAuth.supabaseAdmin`

**Tables Involved:**
- ✅ `users` (INSERT)
- ✅ `user_roles` (INSERT)

---

### 2. **User Login**

**File:** `src/app/api/auth/login/route.ts`

**Database Operations:**
1. Find user by email → `users` table
2. Get user roles → `user_roles` table
3. Verify password → bcrypt compare
4. Update last_login → `users` table
5. Log security event → `security_events` table
6. Create JWT token → JWT library

**Connection Used:** `supabaseAuth`

**Tables Involved:**
- ✅ `users` (SELECT, UPDATE)
- ✅ `user_roles` (SELECT)
- ✅ `security_events` (INSERT)

---

### 3. **Creating an Election**

**File:** `src/app/api/elections/route.ts` (POST method)

**Database Operations:**
1. Verify user is Admin → JWT verification
2. Insert election → `elections` table
3. Insert contests → `contests` table
4. Insert candidates → `candidates` table
5. Set up eligible voters → `eligible_voters` table

**Connection Used:** `supabaseAdmin`

**Tables Involved:**
- ✅ `elections` (INSERT)
- ✅ `contests` (INSERT)
- ✅ `candidates` (INSERT)
- ✅ `eligible_voters` (INSERT)

---

### 4. **Casting a Vote**

**File:** `src/app/api/elections/[id]/vote/route.ts` or `src/app/api/votes/route.ts`

**Database Operations:**
1. Verify election is active → `elections` table
2. Check voter eligibility → `eligible_voters` table
3. Check if already voted → `votes` table
4. Validate contest → `contests` table
5. Validate candidate → `candidates` table
6. Generate vote hash → Crypto SHA-256
7. Get previous vote hash → `votes` table (blockchain chaining)
8. Insert vote record → `votes` table
9. Update voter status to "voted" → `eligible_voters` table

**Connection Used:** `supabaseAuth.supabaseAdmin`

**Tables Involved:**
- ✅ `elections` (SELECT)
- ✅ `contests` (SELECT)
- ✅ `candidates` (SELECT)
- ✅ `eligible_voters` (SELECT, UPDATE)
- ✅ `votes` (SELECT, INSERT)

**Special Feature:** Blockchain-like vote chaining
```typescript
const voteHash = crypto
  .createHash('sha256')
  .update(`${electionId}-${voterId}-${candidateId}-${timestamp}`)
  .digest('hex');

// Each vote links to previous vote for integrity
previous_vote_hash: lastVote?.vote_hash || null
```

---

### 5. **Viewing Election Results**

**File:** `src/app/api/elections/[id]/results/route.ts`

**Database Operations:**
1. Get election details → `elections` table
2. Get all contests → `contests` table
3. Get all candidates → `candidates` table
4. Count votes per candidate → `votes` table (aggregation)
5. Calculate percentages → Application logic
6. Get total turnout → `eligible_voters` + `votes` JOIN

**Connection Used:** `supabaseAdmin`

**Tables Involved:**
- ✅ `elections` (SELECT)
- ✅ `contests` (SELECT)
- ✅ `candidates` (SELECT)
- ✅ `votes` (SELECT with aggregation)
- ✅ `eligible_voters` (SELECT)

**Query Example:**
```typescript
// Get votes with candidate info
const { data: votes } = await supabaseAdmin
  .from('votes')
  .select('candidate_id, candidates(candidate_name, party)')
  .eq('election_id', electionId)
  .eq('contest_id', contestId);

// Aggregate in code
const voteCounts = votes.reduce((acc, vote) => {
  acc[vote.candidate_id] = (acc[vote.candidate_id] || 0) + 1;
  return acc;
}, {});
```

---

### 6. **Managing Users (Admin)**

**File:** `src/app/api/admin/users/route.ts`

**Database Operations:**
1. List all users with roles → `users` + `user_roles` JOIN
2. Update user status → `users` table
3. Assign roles → `user_roles` table (INSERT)
4. Revoke roles → `user_roles` table (DELETE)
5. Log admin actions → `audit_log` table

**Connection Used:** `supabaseAdmin`

**Tables Involved:**
- ✅ `users` (SELECT, UPDATE)
- ✅ `user_roles` (SELECT, INSERT, DELETE)
- ✅ `audit_log` (INSERT via trigger)

---

## 📊 Database Tables Relationship Map

```
                    ┌──────────────┐
                    │    users     │ (Central table)
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
    │ user_roles │  │  elections │  │   votes    │
    └────────────┘  └─────┬──────┘  └─────┬──────┘
                          │                │
                    ┌─────▼──────┐        │
                    │  contests  │◄───────┘
                    └─────┬──────┘
                          │
                    ┌─────▼──────┐
                    │ candidates │
                    └────────────┘

    ┌──────────────────┐
    │ eligible_voters  │◄────────(links users + elections)
    └──────────────────┘

    ┌──────────────────┐
    │   audit_log      │◄────────(tracks all changes)
    └──────────────────┘

    ┌──────────────────┐
    │ security_events  │◄────────(security monitoring)
    └──────────────────┘
```

---

## 🔐 DBMS Concepts Demonstrated

| Concept | Implementation | Location |
|---------|----------------|----------|
| **Normalization (3NF)** | Separate tables for users, roles, elections | All tables |
| **Primary Keys** | UUID for most tables | `user_id`, `election_id`, etc. |
| **Foreign Keys** | References between tables | All relationship columns |
| **Indexes** | Performance optimization | `idx_users_email`, `idx_votes_election` |
| **Constraints** | CHECK, UNIQUE, NOT NULL | Email format, date validation |
| **Triggers** | Auto-update timestamps, audit logging | `update_updated_at_column()` |
| **Functions** | Password hashing, token generation | `hash_password()`, `generate_token()` |
| **Views** | Reporting abstraction | In enhanced schema |
| **Transactions** | ACID compliance via Supabase | All INSERT/UPDATE operations |
| **Security** | Password hashing, SQL injection prevention | bcrypt, parameterized queries |

---

## 🎯 Quick Decision Guide

### Question: "Which SQL file should I use?"
**Answer:** `src/database/schema.sql` - This is THE main production schema

### Question: "How do I connect to the database?"
**Answer:** Use `supabaseAdmin` from `src/lib/supabase.ts`

### Question: "Where is user authentication handled?"
**Answer:** `src/lib/supabase-auth.ts` + `src/app/api/auth/login/route.ts`

### Question: "Where is voting logic?"
**Answer:** `src/app/api/elections/[id]/vote/route.ts` or `src/app/api/votes/route.ts`

### Question: "How are passwords stored?"
**Answer:** Hashed with bcrypt (12 salt rounds) in `password_hash` column

### Question: "How is vote integrity ensured?"
**Answer:** Blockchain-like chaining with SHA-256 hashes in `votes` table

### Question: "Where are security events logged?"
**Answer:** `security_events` table + `audit_log` table

---

## 📂 File Priority Legend

| Symbol | Meaning |
|--------|---------|
| ⭐⭐⭐ | **CRITICAL** - Main production files |
| ⭐⭐ | **IMPORTANT** - Core functionality |
| ⭐ | **USEFUL** - Supporting files |
| 📚 | **REFERENCE** - Documentation/learning |
| 🔧 | **UTILITY** - Tools/fixes |

### Files by Priority:

**⭐⭐⭐ CRITICAL FILES:**
1. `src/database/schema.sql` - Main SQL schema
2. `src/lib/supabase.ts` - Database connection
3. `src/lib/supabase-auth.ts` - Authentication service

**⭐⭐ IMPORTANT FILES:**
4. `src/app/api/auth/login/route.ts` - Login process
5. `src/app/api/auth/register/route.ts` - Registration process
6. `src/app/api/elections/[id]/vote/route.ts` - Voting process
7. `src/app/api/elections/route.ts` - Election management

**⭐ USEFUL FILES:**
8. `src/lib/auth.ts` - JWT verification
9. `src/app/api/elections/[id]/results/route.ts` - Results
10. `src/app/api/admin/users/route.ts` - User management

**📚 REFERENCE FILES:**
11. `database/enhanced_schema.sql` - Academic reference

---

## 🚀 Getting Started Checklist

### For Understanding the Database:
- [ ] Read `src/database/schema.sql` (main schema)
- [ ] Review `DBMS-DOCUMENTATION.md` (this helped you create)
- [ ] Check `database/enhanced_schema.sql` (advanced concepts)

### For Understanding Connections:
- [ ] Review `src/lib/supabase.ts` (main client)
- [ ] Study `src/lib/supabase-auth.ts` (auth service)
- [ ] Check `DATABASE-CONNECTION-FILES.md`

### For Understanding Processes:
- [ ] Registration: `src/app/api/auth/register/route.ts`
- [ ] Login: `src/app/api/auth/login/route.ts`
- [ ] Elections: `src/app/api/elections/route.ts`
- [ ] Voting: `src/app/api/elections/[id]/vote/route.ts`
- [ ] Results: `src/app/api/elections/[id]/results/route.ts`

---

## 📞 Environment Setup

```env
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
JWT_SECRET=your-jwt-secret-minimum-32-characters
```

---

## 📈 Database Statistics

| Metric | Count |
|--------|-------|
| Total Tables | 15 |
| Foreign Keys | 20+ |
| Indexes | 25+ |
| Triggers | 8+ |
| Functions | 5+ |
| Views | 3 (in enhanced schema) |
| Schema Files | 9 |
| API Routes with DB Operations | 30+ |

---

## 🎓 Academic Project Highlights

**DBMS Concepts Covered:**
✅ Relational Database Design
✅ Normalization (3NF)
✅ Primary & Foreign Keys
✅ Referential Integrity
✅ ACID Transactions
✅ Indexing & Performance
✅ Triggers & Automation
✅ Stored Procedures
✅ Views & Abstraction
✅ Security & Encryption
✅ Audit Logging
✅ Constraint Validation

**Technologies Used:**
- PostgreSQL (via Supabase)
- Next.js (API Routes)
- TypeScript
- bcrypt (password hashing)
- JWT (authentication)
- Crypto (vote hashing)

---

**Last Updated:** October 8, 2025  
**Project:** VoteGuard Voting System  
**Course:** Database Management Systems (DBMS)  
**Main Schema:** `src/database/schema.sql` ⭐⭐⭐
