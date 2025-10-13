# 🔧 Technology Stack Clarification
## VoteGuard Voting System

---

## ⚠️ IMPORTANT CLARIFICATION

### ❌ **NOT USING:**
- ~~Azure Database~~
- ~~Azure SQL~~
- ~~Azure Active Directory~~

### ✅ **ACTUALLY USING:**

#### **Database:** Supabase (PostgreSQL)
- **Provider:** Supabase Cloud
- **Database Engine:** PostgreSQL 15+
- **Connection:** `@supabase/supabase-js` client library
- **Hosting:** Supabase Cloud Platform

#### **Authentication:** Custom JWT + bcrypt
- **Password Hashing:** bcrypt.js (12 salt rounds)
- **Session Management:** JWT tokens (jsonwebtoken library)
- **Cookie Storage:** HTTP-only cookies
- **Token Expiration:** 24 hours

---

## 📊 Complete Technology Stack

### Backend
| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database** | Supabase (PostgreSQL) | Data storage |
| **API Framework** | Next.js API Routes | Backend logic |
| **Authentication** | JWT + bcrypt | User auth |
| **Password Hashing** | bcrypt.js | Secure passwords |
| **Session Tokens** | jsonwebtoken | Stateless auth |

### Frontend
| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 14+ (React) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **State Management** | React Context API |

### Database Client Libraries
```json
{
  "@supabase/supabase-js": "^2.x.x",
  "bcryptjs": "^2.x.x",
  "jsonwebtoken": "^9.x.x",
  "uuid": "^9.x.x"
}
```

---

## 🔌 Database Connection Flow

```
User Login Request
    ↓
Next.js API Route (/api/auth/login)
    ↓
src/lib/supabase-auth.ts (SupabaseAuthService)
    ↓
@supabase/supabase-js Client
    ↓
Supabase Cloud API
    ↓
PostgreSQL Database (Supabase hosted)
    ↓
Response back to user
```

---

## 🗄️ Database Details

### Provider: Supabase
- **Type:** Cloud-hosted PostgreSQL
- **URL:** `NEXT_PUBLIC_SUPABASE_URL` (your project URL)
- **API Keys:**
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public access
  - `SUPABASE_SERVICE_ROLE_KEY` - Admin access (server-side only)

### Database Features Used:
✅ PostgreSQL native features (triggers, functions, indexes)
✅ UUID primary keys (uuid-ossp extension)
✅ pgcrypto extension (for cryptographic functions)
✅ Full SQL support
✅ Real-time capabilities (not used yet)
✅ Row Level Security (RLS) - configurable
✅ Automatic backups
✅ Connection pooling

---

## 🔐 Authentication Architecture

### 1. Registration Flow
```
User submits form
    ↓
/api/auth/register
    ↓
bcrypt.hash(password, 12) → password_hash
    ↓
INSERT INTO users (email, password_hash, ...)
    ↓
INSERT INTO user_roles (user_id, role_name='Voter')
    ↓
Return success
```

### 2. Login Flow
```
User submits credentials
    ↓
/api/auth/login
    ↓
SELECT user FROM users WHERE email = ?
    ↓
bcrypt.compare(password, stored_hash)
    ↓
jwt.sign({ userId, email, roles }, JWT_SECRET)
    ↓
Set HTTP-only cookie: auth-token
    ↓
Return user data + token
```

### 3. Protected Routes
```
API Request with cookie
    ↓
verifyJWT(request)
    ↓
jwt.verify(token, JWT_SECRET)
    ↓
Extract user data from token
    ↓
Check roles/permissions
    ↓
Allow/Deny request
```

---

## 📁 Key Configuration Files

### Environment Variables (.env.local)
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-jwt-secret-min-32-chars

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Connection Files
1. **`src/lib/supabase.ts`** - Supabase client initialization
2. **`src/lib/supabase-auth.ts`** - Authentication service (Supabase)
3. **`src/lib/auth.ts`** - JWT verification helpers

---

## 🎯 Why Not Azure?

You're using **Supabase** instead of Azure because:

### Advantages of Supabase:
✅ **Easier Setup** - Quick project creation
✅ **Free Tier** - Generous free plan for learning
✅ **Built-in Features** - Auth, storage, real-time out of the box
✅ **PostgreSQL** - Full SQL support
✅ **Developer Friendly** - Great documentation and DX
✅ **No Azure Subscription** - No credit card needed
✅ **REST API** - Automatic API generation
✅ **Dashboard** - Easy database management UI

### If You Were Using Azure, You'd Need:
❌ Azure subscription (paid)
❌ Azure SQL Database or PostgreSQL setup
❌ Azure Active Directory configuration
❌ More complex authentication setup
❌ VNet and security configuration

---

## 🔄 Migration History

### Previous Confusion:
- Some code had `loginWithAzureDB` function names
- Comments mentioned "Azure Database"
- **Reality:** Always used Supabase

### Fixed:
- ✅ Renamed `loginWithAzureDB` → `login`
- ✅ Updated comments to say "Supabase"
- ✅ Clarified technology stack

---

## 🚀 Deployment Options

### Current Local Development:
- Next.js dev server (`npm run dev`)
- Connects to Supabase Cloud database
- Environment variables from `.env.local`

### Recommended Deployment:
**Vercel** (Best for Next.js):
- Free hosting for Next.js apps
- Automatic deployments from GitHub
- Environment variable management
- Edge functions support
- **Supabase** remains the database (no change)

### Alternative Deployments:
- Netlify (good for Next.js)
- Railway (includes database options)
- Render (includes database options)

**Note:** Database stays on Supabase regardless of where you deploy frontend

---

## 📊 Database Schema

### Main Schema File:
**`src/database/schema.sql`** - PostgreSQL/Supabase schema

### Not Azure SQL:
- ❌ No T-SQL (SQL Server syntax)
- ❌ No Azure-specific features
- ✅ Standard PostgreSQL syntax
- ✅ Supabase-compatible

---

## 🎓 For Academic Documentation

### When describing your project, say:

**Database Management System:**
- "PostgreSQL database hosted on Supabase cloud platform"
- "Relational database with ACID compliance"
- "Cloud-based PostgreSQL with automatic backups and scaling"

**NOT:**
- ~~"Azure Database"~~
- ~~"Microsoft Azure SQL"~~
- ~~"Azure cloud database"~~

**Authentication:**
- "Custom JWT-based authentication with bcrypt password hashing"
- "Stateless authentication using JSON Web Tokens"
- "Secure session management with HTTP-only cookies"

**NOT:**
- ~~"Azure Active Directory"~~
- ~~"Azure AD B2C"~~

---

## 📞 Quick Reference

| What You Have | What It Is | What It's NOT |
|---------------|------------|---------------|
| Database | Supabase (PostgreSQL) | ❌ Azure SQL |
| Hosting | Supabase Cloud | ❌ Azure Cloud |
| Auth | JWT + bcrypt | ❌ Azure AD |
| API | Next.js Routes | ❌ Azure Functions |
| Client | @supabase/supabase-js | ❌ Azure SDK |

---

## 🔧 Code Examples

### ✅ CORRECT - What You're Using:

```typescript
// Supabase connection
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

### ❌ WRONG - What You're NOT Using:

```typescript
// Azure SQL (NOT USED)
import { Connection } from 'tedious';
import { DefaultAzureCredential } from '@azure/identity';
```

---

**Last Updated:** October 8, 2025  
**Project:** VoteGuard Voting System  
**Database:** Supabase (PostgreSQL) - NOT Azure ✅  
**Authentication:** Custom JWT + bcrypt - NOT Azure AD ✅
