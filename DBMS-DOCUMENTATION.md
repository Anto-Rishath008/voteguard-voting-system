# Database Management System (DBMS) Documentation
## VoteGuard Voting System - Academic Project

---

## Table of Contents
1. [Overview](#overview)
2. [DBMS Technology Stack](#dbms-technology-stack)
3. [Database Architecture](#database-architecture)
4. [DBMS Concepts Implemented](#dbms-concepts-implemented)
5. [Main Schema Files](#main-schema-files)
6. [Database Connection Architecture](#database-connection-architecture)
7. [Process-Specific Database Operations](#process-specific-database-operations)
8. [Database Security Features](#database-security-features)
9. [Performance Optimization](#performance-optimization)
10. [Database Tables and Relationships](#database-tables-and-relationships)

---

## Overview

The VoteGuard Voting System is built on **PostgreSQL** (via **Supabase**), a powerful relational database management system. This project demonstrates advanced DBMS concepts including normalization, transactions, indexing, triggers, stored procedures, and security mechanisms.

**Database Provider:** Supabase (PostgreSQL-based Cloud Database)
**ORM/Client:** Supabase JavaScript Client
**Authentication:** JWT + bcrypt password hashing
**Connection Management:** Connection pooling via Supabase

---

## DBMS Technology Stack

### Core Technologies
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database Engine** | PostgreSQL 15+ | Relational database with ACID compliance |
| **Cloud Provider** | Supabase | Managed PostgreSQL with built-in features |
| **Database Client** | @supabase/supabase-js | JavaScript client for database operations |
| **Password Hashing** | bcrypt.js | Secure password storage |
| **JWT Tokens** | jsonwebtoken | Stateless authentication |
| **UUID Generation** | uuid-ossp extension | Unique identifiers |
| **Encryption** | pgcrypto extension | Cryptographic functions |

### Extensions Used
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- Cryptographic functions
```

---

## Database Architecture

### Architecture Pattern
The system uses a **Three-Tier Architecture**:
1. **Presentation Layer** - Next.js Frontend
2. **Application Layer** - Next.js API Routes
3. **Data Layer** - Supabase (PostgreSQL)

### Connection Flow
```
Frontend (React/Next.js)
    ↓
API Routes (/api/*)
    ↓
Database Connection Layer (lib/supabase-auth.ts, lib/supabase.ts)
    ↓
Supabase Client (connection pooling)
    ↓
PostgreSQL Database (Cloud)
```

---

## DBMS Concepts Implemented

### 1. **Database Normalization (3NF - Third Normal Form)**
All tables are normalized to reduce redundancy and ensure data integrity:
- **Users** table stores user information
- **User_roles** table stores role assignments (many-to-many)
- **Elections** separate from **Contests** and **Candidates**
- **Votes** table links voters, elections, contests, and candidates

### 2. **ACID Properties Implementation**

#### Atomicity
```typescript
// Transaction example in voting process
// All vote records are inserted atomically - either all succeed or all fail
const { data, error } = await supabaseAdmin
  .from('votes')
  .insert(voteRecords); // Transaction boundary
```

#### Consistency
- Constraint checks (CHECK, FOREIGN KEY, UNIQUE)
- Data type enforcement
- Trigger-based validation

#### Isolation
- PostgreSQL's MVCC (Multi-Version Concurrency Control)
- Transaction isolation levels managed by Supabase

#### Durability
- Write-Ahead Logging (WAL)
- Automatic backups by Supabase

### 3. **Referential Integrity with Foreign Keys**
```sql
-- Example from schema
CREATE TABLE votes (
    voter_id UUID REFERENCES users(user_id),
    election_id UUID REFERENCES elections(election_id),
    contest_id INTEGER REFERENCES contests(contest_id),
    candidate_id UUID REFERENCES candidates(candidate_id)
);
```

### 4. **Constraints for Data Integrity**
- **PRIMARY KEY**: Unique identification
- **FOREIGN KEY**: Referential integrity
- **UNIQUE**: Prevent duplicates
- **CHECK**: Value validation
- **NOT NULL**: Mandatory fields

Examples:
```sql
-- Email format validation
CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')

-- Date validation
CONSTRAINT check_election_dates CHECK (voting_start < voting_end)

-- Status enum
status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Suspended'))
```

### 5. **Indexes for Performance Optimization**
```sql
-- User-related indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Election-related indexes
CREATE INDEX idx_elections_status ON elections(status);
CREATE INDEX idx_elections_dates ON elections(start_date, end_date);

-- Vote-related indexes
CREATE INDEX idx_votes_voter ON votes(voter_id);
CREATE INDEX idx_votes_election ON votes(election_id);
```

### 6. **Triggers for Automation**
```sql
-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE PROCEDURE update_updated_at_column();
```

### 7. **Stored Procedures and Functions**
```sql
-- Password hashing function
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- Password verification function
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql;
```

### 8. **Views for Data Abstraction**
```sql
-- Active elections view
CREATE VIEW active_elections AS
SELECT 
    e.election_id,
    e.election_name,
    COUNT(DISTINCT v.voter_id) as voter_count
FROM elections e
LEFT JOIN votes v ON e.election_id = v.election_id
WHERE e.status = 'active'
GROUP BY e.election_id, e.election_name;
```

### 9. **Audit Logging**
```sql
CREATE TABLE audit_log (
    audit_id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    operation_type VARCHAR(20),
    table_name VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 10. **Security Features**
- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Stateless tokens
- **Row Level Security (RLS)**: Planned/configurable
- **SQL Injection Prevention**: Parameterized queries
- **Failed Login Tracking**: Account lockout mechanism

---

## Main Schema Files

### 📄 **Primary Schema File (Currently Used)**
**File:** `src/database/schema.sql`
**Status:** ✅ **ACTIVE - This is the main schema file used in production**
**Size:** 322 lines
**Purpose:** Production database schema with all active tables

**Key Features:**
- User authentication with password hashing
- Role-based access control (RBAC)
- Elections and voting system
- Audit logging
- Security events tracking
- Eligible voters management
- Session management

**Tables Included:**
1. `users` - User accounts and authentication
2. `user_roles` - Role assignments (Voter, Admin, SuperAdmin)
3. `jurisdictions` - Geographic/organizational boundaries
4. `elections` - Election definitions
5. `election_jurisdictions` - Election scope
6. `contests` - Voting contests within elections
7. `candidates` - Candidate information
8. `candidate_profiles` - Extended candidate data
9. `user_sessions` - Active user sessions
10. `votes` - Voting records (append-only, blockchain-like)
11. `eligible_voters` - Voter eligibility tracking
12. `audit_log` - Complete system audit trail
13. `security_events` - Security-related events
14. `anomaly_detections` - AI/ML anomaly detection
15. `verification_tokens` - Email/password reset tokens
16. `system_configuration` - System settings

---

### 📄 **Enhanced Schema File (Academic/Development)**
**File:** `database/enhanced_schema.sql`
**Status:** 📚 Academic reference / Enhanced version
**Size:** 469 lines
**Purpose:** Demonstrates advanced DBMS concepts for academic purposes

**Additional Features:**
- Organizations/Institutions table
- More complex candidate management
- Vote encryption and hashing
- Advanced stored procedures
- Election results calculation functions
- Reporting views (active_elections, user_statistics, voting_statistics)
- More comprehensive audit triggers

---

### 📄 **Supporting Schema Files**

| File | Purpose | Status |
|------|---------|--------|
| `database/simplified-schema.sql` | Minimal setup | Reference |
| `database/quick-setup.sql` | Quick development setup | Development |
| `src/database/password-reset-schema.sql` | Password reset tables | Integrated |
| `src/database/otp-schema.sql` | OTP/2FA support | Integrated |
| `src/database/seed.sql` | Sample data | Development |
| `database/fix-status-constraint.sql` | Migration script | Applied |
| `database/simplified-registration-schema.sql` | Registration tables | Applied |

---

## Database Connection Architecture

### Connection Files Overview

| File | Purpose | Usage |
|------|---------|-------|
| `src/lib/supabase.ts` | Main Supabase client | General database operations |
| `src/lib/supabase-auth.ts` | Authentication service | User authentication & authorization |
| `src/lib/auth.ts` | JWT verification | Token validation |
| `src/lib/database.ts` | Legacy database functions | Migration/compatibility |

---

### 1. **Main Database Connection - `src/lib/supabase.ts`**

```typescript
// Primary database client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public client (limited permissions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (full permissions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin access)

**Usage:** General database queries, admin operations

---

### 2. **Authentication Service - `src/lib/supabase-auth.ts`**

```typescript
// Authentication-specific database operations
export class SupabaseAuthService {
  public supabaseAdmin = supabaseAdmin;
  
  // Get user with roles
  async getUserWithRolesByEmail(email: string): Promise<User | null>
  
  // Password verification
  async verifyPassword(password: string, hash: string): Promise<boolean>
  
  // Login tracking
  async updateLastLogin(userId: string): Promise<void>
  async incrementFailedLoginAttempts(userId: string): Promise<void>
  
  // Security logging
  async logSecurityEvent(event: SecurityEvent): Promise<void>
  
  // Connection testing
  async testConnection(): Promise<boolean>
}

export const supabaseAuth = new SupabaseAuthService();
```

**Key Methods:**
- `getUserWithRolesByEmail()` - Fetch user with role information
- `verifyPassword()` - bcrypt password comparison
- `updateLastLogin()` - Track login timestamp
- `incrementFailedLoginAttempts()` - Account lockout logic
- `logSecurityEvent()` - Security audit trail

**Usage:** User authentication, login/logout, security events

---

### 3. **JWT Authentication - `src/lib/auth.ts`**

```typescript
// JWT token verification
export function verifyJWT(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    return { user: null, error: "No token provided" };
  }
  
  try {
    const decoded = verify(token, process.env.JWT_SECRET!);
    return { user: decoded, error: null };
  } catch (error) {
    return { user: null, error: "Invalid token" };
  }
}
```

**Usage:** API route authentication, role verification

---

## Process-Specific Database Operations

### 1. **User Registration Process**

**File:** `src/app/api/auth/register/route.ts`

**Database Operations:**
```typescript
// 1. Check if user exists
const { data: existingUser } = await supabaseAuth.supabaseAdmin
  .from('users')
  .select('email')
  .eq('email', email.toLowerCase())
  .single();

// 2. Hash password
const passwordHash = await bcrypt.hash(password, 12);

// 3. Insert new user
const { data: newUser } = await supabaseAuth.supabaseAdmin
  .from('users')
  .insert([{
    user_id: userId,
    email: email.toLowerCase(),
    first_name: firstName,
    last_name: lastName,
    status: 'Active',
    password_hash: passwordHash
  }])
  .select()
  .single();

// 4. Assign role
await supabaseAuth.supabaseAdmin
  .from('user_roles')
  .insert([{
    user_id: userId,
    role_name: 'Voter'
  }]);
```

**Tables Involved:**
- `users` (INSERT)
- `user_roles` (INSERT)

**DBMS Concepts:**
- Transaction (implicit via Supabase)
- Password hashing (bcrypt)
- Foreign key constraints
- Unique constraint on email

---

### 2. **User Login Process**

**File:** `src/app/api/auth/login/route.ts`

**Database Operations:**
```typescript
// 1. Test database connection
const isConnected = await supabaseAuth.testConnection();

// 2. Fetch user with roles
const user = await supabaseAuth.getUserWithRolesByEmail(email);

// 3. Get password hash
const { data: passwordData } = await supabaseAuth.supabaseAdmin
  .from('users')
  .select('password_hash')
  .eq('user_id', user.user_id)
  .single();

// 4. Verify password
const isPasswordValid = await supabaseAuth.verifyPassword(
  password, 
  passwordData.password_hash
);

// 5. Update login timestamp
await supabaseAuth.updateLastLogin(user.user_id);

// 6. Log security event
await supabaseAuth.logSecurityEvent({
  action: 'LOGIN_SUCCESS',
  details: { email, roles: user.roles },
  user_id: user.user_id
});

// 7. Generate JWT token
const token = sign({ userId, email, roles }, jwtSecret, { expiresIn: '24h' });
```

**Tables Involved:**
- `users` (SELECT, UPDATE)
- `user_roles` (SELECT)
- `security_events` (INSERT)

**DBMS Concepts:**
- JOIN operations (implicit via query)
- bcrypt password verification
- Atomic updates
- Audit logging
- Session management

---

### 3. **Creating an Election**

**File:** `src/app/api/elections/route.ts`

**Database Operations:**
```typescript
// 1. Verify user is admin
const { user: authUser } = verifyJWT(request);

// 2. Insert election
const { data: newElection } = await supabaseAdmin
  .from('elections')
  .insert([{
    election_id: uuidv4(),
    election_name: electionName,
    description: description,
    status: 'Draft',
    start_date: startDate,
    end_date: endDate,
    creator: authUser.userId
  }])
  .select()
  .single();

// 3. Insert contests
const contestInserts = contests.map(contest => ({
  contest_id: contest.id,
  election_id: newElection.election_id,
  contest_title: contest.title,
  contest_type: contest.type
}));

await supabaseAdmin
  .from('contests')
  .insert(contestInserts);

// 4. Insert candidates
for (const candidate of candidates) {
  await supabaseAdmin
    .from('candidates')
    .insert([{
      candidate_id: uuidv4(),
      contest_id: candidate.contestId,
      election_id: newElection.election_id,
      candidate_name: candidate.name,
      party: candidate.party
    }]);
}
```

**Tables Involved:**
- `elections` (INSERT)
- `contests` (INSERT)
- `candidates` (INSERT)
- `audit_log` (INSERT via trigger)

**DBMS Concepts:**
- Foreign key relationships
- Cascading operations
- Transaction boundaries
- CHECK constraints validation
- Audit triggers

---

### 4. **Casting a Vote**

**File:** `src/app/api/elections/[id]/vote/route.ts` or `src/app/api/votes/route.ts`

**Database Operations:**
```typescript
// 1. Verify election is active
const { data: electionData } = await supabaseAuth.supabaseAdmin
  .from('elections')
  .select('*')
  .eq('election_id', electionId)
  .single();

// 2. Check voter eligibility
const { data: eligibilityData } = await supabaseAuth.supabaseAdmin
  .from('eligible_voters')
  .select('*')
  .eq('election_id', electionId)
  .eq('user_id', authUser.userId)
  .single();

// 3. Check for existing vote (prevent double voting)
const { data: existingVote } = await supabaseAuth.supabaseAdmin
  .from('votes')
  .select('vote_id')
  .eq('election_id', electionId)
  .eq('voter_id', authUser.userId)
  .eq('contest_id', contestId)
  .maybeSingle();

// 4. Generate vote hash (blockchain-like integrity)
const voteHash = crypto
  .createHash('sha256')
  .update(`${electionId}-${voterId}-${candidateId}-${timestamp}`)
  .digest('hex');

// 5. Get previous vote hash (chaining)
const { data: lastVote } = await supabaseAuth.supabaseAdmin
  .from('votes')
  .select('vote_hash')
  .order('vote_timestamp', { ascending: false })
  .limit(1)
  .maybeSingle();

// 6. Insert vote record
const { data: voteRecord } = await supabaseAuth.supabaseAdmin
  .from('votes')
  .insert([{
    vote_id: uuidv4(),
    election_id: electionId,
    contest_id: contestId,
    voter_id: authUser.userId,
    candidate_id: candidateId,
    vote_hash: voteHash,
    previous_vote_hash: lastVote?.vote_hash || null,
    vote_timestamp: new Date().toISOString()
  }])
  .select()
  .single();

// 7. Update eligible_voters status
await supabaseAuth.supabaseAdmin
  .from('eligible_voters')
  .update({ status: 'voted' })
  .eq('election_id', electionId)
  .eq('user_id', authUser.userId);
```

**Tables Involved:**
- `elections` (SELECT)
- `contests` (SELECT)
- `candidates` (SELECT)
- `eligible_voters` (SELECT, UPDATE)
- `votes` (SELECT, INSERT)
- `audit_log` (INSERT via trigger)

**DBMS Concepts:**
- Complex multi-table queries
- Transaction atomicity (all or nothing)
- UNIQUE constraints (one vote per contest)
- Cryptographic hashing (vote integrity)
- Blockchain-like chaining (tamper detection)
- Audit trail automation

---

### 5. **Fetching Election Results**

**File:** `src/app/api/elections/[id]/results/route.ts`

**Database Operations:**
```typescript
// 1. Get election details
const { data: election } = await supabaseAdmin
  .from('elections')
  .select('*')
  .eq('election_id', electionId)
  .single();

// 2. Get contest results with candidate vote counts
const { data: contests } = await supabaseAdmin
  .from('contests')
  .select(`
    contest_id,
    contest_title,
    contest_type
  `)
  .eq('election_id', electionId);

// 3. For each contest, aggregate votes
for (const contest of contests) {
  const { data: voteResults } = await supabaseAdmin
    .from('votes')
    .select(`
      candidate_id,
      candidates (
        candidate_name,
        party
      )
    `)
    .eq('election_id', electionId)
    .eq('contest_id', contest.contest_id);
  
  // 4. Group and count votes (aggregation)
  const voteCounts = voteResults.reduce((acc, vote) => {
    const candidateId = vote.candidate_id;
    acc[candidateId] = (acc[candidateId] || 0) + 1;
    return acc;
  }, {});
}

// 5. Calculate percentages
const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
const results = candidates.map(candidate => ({
  candidateName: candidate.name,
  voteCount: voteCounts[candidate.id] || 0,
  percentage: ((voteCounts[candidate.id] || 0) / totalVotes * 100).toFixed(2)
}));
```

**Tables Involved:**
- `elections` (SELECT)
- `contests` (SELECT)
- `candidates` (SELECT)
- `votes` (SELECT with JOIN)

**DBMS Concepts:**
- JOIN operations
- Aggregation (COUNT, SUM)
- GROUP BY (implicit)
- Calculated fields (percentages)
- Complex nested queries

---

### 6. **Admin User Management**

**File:** `src/app/api/admin/users/route.ts`

**Database Operations:**
```typescript
// 1. List all users with roles
const { data: users } = await supabaseAdmin
  .from('users')
  .select(`
    user_id,
    email,
    first_name,
    last_name,
    status,
    created_at,
    user_roles (role_name)
  `)
  .order('created_at', { ascending: false });

// 2. Update user status
await supabaseAdmin
  .from('users')
  .update({ status: 'Suspended' })
  .eq('user_id', userId);

// 3. Assign/revoke roles
await supabaseAdmin
  .from('user_roles')
  .insert([{
    user_id: userId,
    role_name: 'Admin'
  }]);

await supabaseAdmin
  .from('user_roles')
  .delete()
  .eq('user_id', userId)
  .eq('role_name', 'Admin');
```

**Tables Involved:**
- `users` (SELECT, UPDATE)
- `user_roles` (SELECT, INSERT, DELETE)

**DBMS Concepts:**
- JOIN queries (nested select)
- UPDATE operations
- DELETE operations
- CRUD operations

---

## Database Security Features

### 1. **Password Security**
```typescript
// Hashing (Registration)
const passwordHash = await bcrypt.hash(password, 12); // 12 salt rounds

// Verification (Login)
const isValid = await bcrypt.compare(password, storedHash);
```

### 2. **SQL Injection Prevention**
```typescript
// ✅ SAFE - Parameterized query (Supabase)
await supabaseAdmin
  .from('users')
  .select('*')
  .eq('email', userInput); // Automatically escaped

// ❌ UNSAFE - Would be vulnerable if using raw SQL
// await db.query(`SELECT * FROM users WHERE email = '${userInput}'`);
```

### 3. **Authentication & Authorization**
```typescript
// JWT token verification on every API call
const { user, error } = verifyJWT(request);
if (error || !user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Role-based access control
if (!user.roles.includes('Admin')) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### 4. **Account Lockout**
```sql
-- Automatic lockout after 5 failed attempts
UPDATE users 
SET 
  failed_login_attempts = failed_login_attempts + 1,
  locked_until = CASE 
    WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
    ELSE locked_until
  END
WHERE user_id = $1;
```

### 5. **Audit Logging**
Every critical operation is logged:
- User logins/logouts
- Vote casting
- Election creation/modification
- Role changes
- Security events

---

## Performance Optimization

### 1. **Indexing Strategy**
```sql
-- Frequently queried fields
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_elections_status ON elections(status);
CREATE INDEX idx_votes_voter ON votes(voter_id);
CREATE INDEX idx_votes_election ON votes(election_id);

-- Composite indexes for complex queries
CREATE INDEX idx_votes_election_contest ON votes(election_id, contest_id);
CREATE INDEX idx_eligible_voters_election_user 
  ON eligible_voters(election_id, user_id);
```

### 2. **Query Optimization**
- Use `.select()` with specific columns instead of `SELECT *`
- Limit result sets with `.limit()`
- Use `.single()` when expecting one result
- Implement pagination with `.range()`

### 3. **Connection Pooling**
Supabase automatically manages connection pooling to prevent connection exhaustion.

---

## Database Tables and Relationships

### Entity-Relationship Overview

```
users (1) ←→ (N) user_roles
users (1) ←→ (N) elections [creator]
users (1) ←→ (N) votes [voter]
users (1) ←→ (N) eligible_voters

elections (1) ←→ (N) contests
elections (1) ←→ (N) votes
elections (1) ←→ (N) eligible_voters

contests (1) ←→ (N) candidates
contests (1) ←→ (N) votes

candidates (1) ←→ (N) votes
```

### Core Tables

#### 1. **users**
- Primary Key: `user_id` (UUID)
- Stores: Authentication credentials, personal info, status
- Relationships: user_roles, elections, votes, eligible_voters

#### 2. **user_roles**
- Primary Key: Composite (`user_id`, `role_name`)
- Stores: Role assignments (Voter, Admin, SuperAdmin)
- Relationships: users

#### 3. **elections**
- Primary Key: `election_id` (UUID)
- Stores: Election metadata, dates, status
- Relationships: users (creator), contests, votes, eligible_voters

#### 4. **contests**
- Primary Key: Composite (`contest_id`, `election_id`)
- Stores: Voting contests within elections
- Relationships: elections, candidates, votes

#### 5. **candidates**
- Primary Key: `candidate_id` (UUID)
- Stores: Candidate information
- Relationships: contests, votes

#### 6. **votes**
- Primary Key: `vote_id` (UUID)
- Stores: Vote records with cryptographic hash
- Relationships: users, elections, contests, candidates
- Special: Blockchain-like chaining with `previous_vote_hash`

#### 7. **eligible_voters**
- Primary Key: Composite (`election_id`, `user_id`)
- Stores: Voter eligibility and voting status
- Relationships: elections, users

#### 8. **audit_log**
- Primary Key: `audit_id` (UUID)
- Stores: Complete audit trail of system operations
- Relationships: users

#### 9. **security_events**
- Primary Key: `event_id` (SERIAL)
- Stores: Security-related events (failed logins, suspicious activity)
- Relationships: users, user_sessions

---

## Conclusion

This VoteGuard Voting System demonstrates comprehensive DBMS concepts including:

✅ **Normalization** (3NF)
✅ **ACID Transactions**
✅ **Foreign Key Constraints**
✅ **Indexing for Performance**
✅ **Triggers and Stored Procedures**
✅ **Security (Password Hashing, SQL Injection Prevention)**
✅ **Audit Logging**
✅ **Role-Based Access Control**
✅ **Data Integrity Constraints**
✅ **Views for Abstraction**

The system uses **`src/database/schema.sql`** as the main production schema file, with enhanced academic features demonstrated in **`database/enhanced_schema.sql`**.

---

**Last Updated:** October 8, 2025
**Project:** VoteGuard Voting System
**Course:** Database Management Systems (DBMS)
**Technology:** PostgreSQL via Supabase
