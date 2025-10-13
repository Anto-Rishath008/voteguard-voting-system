# VoteGuard - Enterprise Voting System

A comprehensive, enterprise-grade voting system built with ### 5. Run Database Migrations
The schema is already executed in step 3. Verify tables are created in Supabase dashboard.s, TypeScript, and Supabase (PostgreSQL). This system demonstrates advanced Database Management System concepts with role-based access control, real-time election management, comprehensive audit capabilities, and enterprise-level security features.

## 🎓 Database Management System Project

This project showcases advanced database concepts for academic excellence:
- **Advanced Data Modeling**: Comprehensive ER design with 3NF normalization
- **ACID Compliance**: Full transaction management with consistency guarantees
- **Enterprise Security**: Multi-layered security with RBAC, audit trails, encryption
- **Performance Optimization**: Strategic indexing, connection pooling, query monitoring
- **Cloud Architecture**: Supabase with Vercel deployment and scalable design
- **Professional Documentation**: Complete technical documentation and deployment guides

## 🚀 Enhanced Features

### Core Functionality
- **Role-Based Authentication**: Voters, Admins, Super Admins with granular permissions
- **Election Management**: Complete lifecycle management with advanced controls
- **Secure Voting**: Multi-layered encryption with integrity verification
- **Real-time Analytics**: Live results with performance metrics
- **Advanced Dashboard**: Comprehensive statistics and monitoring

### Enterprise Features
- **Audit Logging**: Complete trail of all system operations
- **Security Monitoring**: Real-time threat detection and response
- **Performance Metrics**: Query optimization and database monitoring
- **Connection Pooling**: Efficient resource management and scalability
- **Data Encryption**: Advanced encryption at rest and in transit
- **Account Security**: Multi-factor authentication with lockout protection

## 🛠 Enterprise Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with responsive design
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **Authentication**: Supabase Auth with JWT, bcrypt, multi-layered security
- **Database Library**: Supabase client with connection pooling
- **Icons**: Lucide React
- **Deployment**: Vercel with automatic CI/CD pipeline
- **Monitoring**: Built-in performance and security monitoring

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available)
- Vercel account (free tier available)
- Git

## 🗄️ Enhanced Database Architecture

### Core Tables (8 Tables)
- **users**: User management with role-based access
- **user_roles**: Flexible role assignment system
- **organizations**: Multi-tenant organization support
- **elections**: Comprehensive election management
- **contests**: Individual voting contests within elections
- **candidates**: Candidate management with metadata
- **votes**: Secure vote storage with encryption
- **audit_logs**: Complete audit trail for compliance
- **security_events**: Security monitoring and threat detection
- **voter_eligibility**: Advanced voter verification system

### Advanced Database Features
- **Stored Procedures**: Complex business logic in database
- **Triggers**: Automated audit logging and data validation
- **Views**: Optimized reporting and analytics queries
- **Strategic Indexes**: Performance optimization for key operations
- **Connection Pooling**: Efficient resource management
- **Transaction Management**: ACID compliance with rollback support

## 🚀 Quick Start (Supabase + Vercel)

### 1. Clone the repository
```bash
git clone <repository-url>
cd voting-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Supabase Setup
1. Create a new project on [Supabase](https://supabase.com)
2. Run the database schema from `database/enhanced_schema.sql` in Supabase SQL Editor
3. Get your project credentials from Project Settings → API

### 4. Environment Configuration
Create a `.env.local` file with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENABLE_AUDIT_LOGGING=true
ENABLE_SECURITY_MONITORING=true
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:8000](http://localhost:8000) to view the application.

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── admin/          # Admin dashboard and management
│   ├── api/            # API routes
│   ├── dashboard/      # User dashboards
│   ├── elections/      # Election views and voting
│   └── auth/           # Authentication pages
├── components/         # Reusable UI components
├── contexts/          # React contexts (Auth, etc.)
├── database/          # SQL schema and seed files
├── lib/               # Utility functions and configurations
└── types/             # TypeScript type definitions
```

## 🔐 User Roles

- **Voter**: Can view and participate in assigned elections
- **Admin**: Can create and manage elections, view results
- **Super Admin**: Full system access, user management, audit logs

## 🚀 Deployment

### Vercel Deployment
This application is configured for deployment on Vercel with Supabase.

1. **Database**: Supabase (PostgreSQL)
2. **Hosting**: Vercel with automatic deployments
3. **Environment**: Configure environment variables in Vercel dashboard

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Elections
- `GET /api/elections` - List elections
- `POST /api/elections` - Create election (Admin)
- `GET /api/elections/[id]` - Get election details
- `POST /api/elections/[id]/vote` - Submit vote

### Admin
- `GET /api/admin/users` - Manage users
- `GET /api/admin/audit-logs` - View audit logs
- `GET /api/admin/dashboard` - Admin dashboard data

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- SQL injection prevention
- XSS protection
- Audit logging for all actions

## 🧪 Testing

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📊 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the GitHub repository.

---

Built with ❤️ for secure and transparent elections
