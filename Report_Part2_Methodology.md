# 2. METHODOLOGY

## 2.1 System Architecture

VoteGuard implements a modern three-tier cloud architecture consisting of the presentation layer, application layer, and data layer, all deployed across cloud services.

### 2.1.1 Architecture Overview

The system follows a **hybrid cloud service model** combining:
- **Platform as a Service (PaaS)** - Vercel for application hosting
- **Backend as a Service (BaaS)** - Supabase for database and authentication
- **Infrastructure as a Service (IaaS)** - Underlying AWS infrastructure

**[INSERT FIGURE 2.1: Cloud Architecture Diagram - Complete system architecture showing Vercel, Supabase, and user interactions]**

### 2.1.2 Cloud Architecture Components

**1. User Layer:**
- Web browsers accessing the application globally
- Responsive design supporting desktop, tablet, and mobile devices
- HTTPS/TLS 1.3 encrypted connections

**2. Vercel Edge Network (Frontend Layer):**
- **Global CDN:** 100+ edge locations worldwide for low-latency access
- **Automatic HTTPS:** SSL/TLS certificates managed automatically
- **DDoS Protection:** Built-in protection against distributed attacks
- **Load Balancing:** Automatic distribution of traffic across servers
- **Edge Caching:** Static assets cached at edge locations

**3. Next.js Application Layer:**
- **Server-Side Rendering (SSR):** Dynamic pages rendered on server
- **Static Site Generation (SSG):** Pre-rendered pages for performance
- **API Routes:** Serverless functions for backend logic
- **Middleware:** Authentication and authorization checks
- **Client State Management:** React Context for user sessions

**4. Vercel Serverless Functions:**
- API route handlers for authentication
- Database query execution
- JWT token validation
- Email and SMS notifications
- No server management required

**5. Supabase Cloud Platform (Backend Layer):**

**PostgreSQL Database:**
- Hosted PostgreSQL 15+ with automatic updates
- Connection pooling via pgBouncer (1000+ connections)
- Automatic daily backups with 7-day retention
- Point-in-time recovery capabilities
- Row-Level Security (RLS) for data isolation

**Authentication Service:**
- JWT token generation and validation
- Session management across devices
- Password hashing with bcrypt (12 rounds)
- Token refresh mechanisms

**Storage Service:**
- S3-compatible file storage
- CDN distribution for uploaded files
- Automatic file backups

**Realtime Engine:**
- WebSocket connections for live updates
- Pub/Sub architecture for notifications
- Real-time vote counting
- <100ms latency for updates

### 2.1.3 Data Flow

**User Authentication Flow:**
1. User enters credentials in frontend form
2. Request sent to Vercel API route via HTTPS
3. API route queries Supabase database
4. Password verified using bcrypt comparison
5. JWT token generated and returned
6. Token stored in browser (httpOnly cookie)
7. Subsequent requests include JWT for authorization

**Voting Flow:**
1. Authenticated user selects candidate
2. Frontend validates eligibility (already voted check)
3. Vote submitted to API route with JWT
4. API verifies user identity and election status
5. Vote recorded in database with encryption
6. Real-time update triggered via WebSocket
7. Confirmation returned to user

**Real-time Updates Flow:**
1. Client subscribes to election channel
2. WebSocket connection established with Supabase
3. Vote recorded triggers database event
4. Real-time engine broadcasts update
5. All subscribed clients receive update
6. UI automatically refreshes with new counts

## 2.2 Database Design

VoteGuard uses **PostgreSQL 15+** hosted on Supabase cloud, implementing advanced database management concepts including normalization, constraints, triggers, and stored procedures.

### 2.2.1 Database Schema

The database follows **Third Normal Form (3NF)** to eliminate data redundancy and ensure data integrity.

**[INSERT FIGURE 2.2: Database ER Diagram - Complete entity-relationship diagram showing all tables and relationships]**

### 2.2.2 Core Tables

**1. users Table:**
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP
);
```

**2. user_roles Table:**
```sql
CREATE TABLE user_roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(user_id),
    UNIQUE(user_id, role_name)
);
```

**3. elections Table:**
```sql
CREATE TABLE elections (
    election_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'upcoming',
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_votes INTEGER DEFAULT 0
);
```

**4. candidates Table:**
```sql
CREATE TABLE candidates (
    candidate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID REFERENCES elections(election_id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    party_affiliation VARCHAR(100),
    biography TEXT,
    photo_url VARCHAR(500),
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**5. votes Table:**
```sql
CREATE TABLE votes (
    vote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID REFERENCES elections(election_id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    voter_id UUID REFERENCES users(user_id),
    vote_hash VARCHAR(255) NOT NULL,
    cast_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    UNIQUE(election_id, voter_id)
);
```

**6. audit_logs Table:**
```sql
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2.3 Database Features

**Normalization:**
- All tables in Third Normal Form (3NF)
- No transitive dependencies
- Eliminated data redundancy
- Atomic values in all columns

**Constraints:**
- **Primary Keys:** UUID for all tables
- **Foreign Keys:** Referential integrity with CASCADE options
- **Unique Constraints:** Prevent duplicate votes, roles
- **Check Constraints:** Validate status values, dates
- **NOT NULL Constraints:** Ensure required fields

**Indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_votes_election ON votes(election_id);
CREATE INDEX idx_votes_voter ON votes(voter_id);
CREATE INDEX idx_candidates_election ON candidates(election_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
```

**Triggers:**

1. **Update Timestamp Trigger:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

2. **Vote Count Trigger:**
```sql
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE candidates 
    SET vote_count = vote_count + 1 
    WHERE candidate_id = NEW.candidate_id;
    
    UPDATE elections 
    SET total_votes = total_votes + 1 
    WHERE election_id = NEW.election_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_vote_counts 
    AFTER INSERT ON votes
    FOR EACH ROW EXECUTE FUNCTION update_vote_counts();
```

**Stored Procedures:**

```sql
CREATE OR REPLACE FUNCTION get_election_results(p_election_id UUID)
RETURNS TABLE (
    candidate_name VARCHAR,
    vote_count INTEGER,
    percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.candidate_name,
        c.vote_count,
        ROUND((c.vote_count::DECIMAL / NULLIF(e.total_votes, 0) * 100), 2) as percentage
    FROM candidates c
    JOIN elections e ON c.election_id = e.election_id
    WHERE e.election_id = p_election_id
    ORDER BY c.vote_count DESC;
END;
$$ LANGUAGE plpgsql;
```

**Row-Level Security (RLS):**

```sql
-- Enable RLS on votes table
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Policy: Voters can only see their own votes
CREATE POLICY voter_own_votes ON votes
    FOR SELECT
    USING (auth.uid() = voter_id);

-- Policy: Only admins can view all votes
CREATE POLICY admin_all_votes ON votes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role_name IN ('admin', 'superadmin')
        )
    );
```

## 2.3 Cloud Platform - Supabase

Supabase serves as the Backend as a Service (BaaS) platform providing database, authentication, storage, and real-time capabilities.

**[INSERT FIGURE 2.3: Supabase Platform Components - Dashboard screenshot or architecture diagram]**

### 2.3.1 Database as a Service (DBaaS)

**Features:**
- **Hosted PostgreSQL 15+** with automatic updates and security patches
- **Connection Pooling** via pgBouncer handling 1000+ concurrent connections
- **Automatic Backups** daily with 7-day retention period
- **Point-in-Time Recovery** for disaster recovery scenarios
- **Global Distribution** with read replicas in multiple regions
- **Auto-Scaling** based on resource utilization

**Implementation:**

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public client for browser operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side privileged operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

**Connection Pooling Configuration:**
- Mode: Transaction pooling
- Pool size: Dynamic (1-100 connections)
- Timeout: 30 seconds
- Max client connections: 1000

### 2.3.2 Authentication Service

**Capabilities:**
- JWT token generation and validation
- Session management with automatic refresh
- Password hashing with bcrypt (12 salt rounds)
- Email verification workflows
- Password reset functionality
- Multi-factor authentication support

**Implementation:**

```typescript
// Authentication flow
async function authenticateUser(email: string, password: string) {
    // Query user from cloud database
    const { data: user } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    
    // Verify password using bcrypt
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (isValid) {
        // Generate JWT token
        const token = jwt.sign(
            { userId: user.user_id, email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );
        return { success: true, token };
    }
}
```

### 2.3.3 Real-time Engine

**Features:**
- WebSocket connections for live data streaming
- Pub/Sub architecture for event broadcasting
- Row-level security applied to real-time data
- <100ms latency for updates
- Automatic reconnection handling

**Implementation:**

```typescript
// Subscribe to election updates
const channel = supabase
    .channel(`election:${electionId}`)
    .on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'votes',
            filter: `election_id=eq.${electionId}`
        },
        (payload) => {
            // Update UI with new vote
            updateVoteCount(payload.new);
        }
    )
    .subscribe();
```

### 2.3.4 Security Features

**Encryption:**
- **At Rest:** AES-256 encryption for all stored data
- **In Transit:** TLS 1.3 for all connections
- **Password Hashing:** bcrypt with 12 salt rounds

**Access Control:**
- Row-Level Security (RLS) policies
- Role-based access control
- API key authentication
- JWT token validation

**Monitoring:**
- Query performance monitoring
- Connection pool statistics
- Error logging and alerting
- Security event tracking

## 2.4 Frontend Framework - Next.js

Next.js 15 with React 19 provides the frontend framework with server-side rendering, static generation, and API routes.

**[INSERT FIGURE 2.4: Next.js Application Structure - Folder structure or component hierarchy diagram]**

### 2.4.1 Application Structure

```
src/
├── app/                    # Next.js 15 App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Landing page
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── dashboard/         # Voter dashboard
│   ├── admin/             # Admin panel
│   ├── superadmin/        # Super admin panel
│   ├── elections/         # Election pages
│   └── api/               # API routes (serverless)
├── components/            # Reusable React components
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
└── styles/                # CSS and styling
```

### 2.4.2 Key Features

**Server-Side Rendering (SSR):**
- Dynamic pages rendered on server
- SEO optimization
- Fast initial page load

**Static Site Generation (SSG):**
- Pre-rendered pages at build time
- Optimal performance for static content

**API Routes (Serverless Functions):**
```typescript
// app/api/auth/login/route.ts
export async function POST(request: Request) {
    const { email, password } = await request.json();
    
    // Authenticate user
    const result = await authenticateUser(email, password);
    
    return Response.json(result);
}
```

**Middleware:**
```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth-token');
    
    // Verify JWT and check permissions
    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
}
```

### 2.4.3 Responsive Design

- **Tailwind CSS** for utility-first styling
- Mobile-first responsive design
- Dark mode support
- Accessibility features (WCAG 2.1)

## 2.5 Authentication System

**[INSERT FIGURE 2.5: Authentication Flow Diagram - Flowchart showing login, registration, and authorization process]**

### 2.5.1 Authentication Flow

**Registration:**
1. User submits registration form
2. Frontend validates input
3. API route receives request
4. Password hashed with bcrypt
5. User created in database
6. Verification email sent
7. Default 'voter' role assigned

**Login:**
1. User enters credentials
2. API queries database
3. Password verified with bcrypt
4. JWT token generated
5. Token stored in httpOnly cookie
6. User redirected to dashboard

**Authorization:**
1. Request includes JWT token
2. Middleware validates token
3. User roles fetched from database
4. Access granted/denied based on role

### 2.5.2 Security Measures

- Password requirements: 8+ characters, uppercase, lowercase, number
- Bcrypt hashing with 12 salt rounds
- JWT tokens with 24-hour expiration
- HttpOnly cookies to prevent XSS
- CSRF token validation
- Rate limiting on login attempts
- Account lockout after 5 failed attempts

## 2.6 Deployment - Vercel

Vercel provides the Platform as a Service (PaaS) for hosting and deploying the application.

**[INSERT FIGURE 2.6: Vercel Deployment Pipeline - CI/CD workflow diagram]**

### 2.6.1 Deployment Architecture

**Global Edge Network:**
- 100+ edge locations worldwide
- Automatic HTTPS with SSL certificates
- DDoS protection built-in
- Automatic load balancing
- Edge caching for static assets

**Serverless Functions:**
- API routes deployed as serverless functions
- Automatic scaling based on demand
- Cold start optimization
- Regional execution for low latency

### 2.6.2 CI/CD Pipeline

**Automatic Deployment:**
1. Code pushed to GitHub repository
2. Vercel webhook triggered
3. Build process initiated
4. Tests executed
5. Production deployment
6. Automatic rollback on errors

**Environment Variables:**
- Secure storage of API keys
- Separate production and preview environments
- Encrypted environment variables

### 2.6.3 Performance Optimization

- **Automatic Code Splitting:** Load only required JavaScript
- **Image Optimization:** Automatic WebP conversion and resizing
- **CDN Caching:** Static assets cached globally
- **Edge Functions:** Compute at edge for low latency
- **HTTP/2 and HTTP/3:** Latest protocols for fast connections

---

