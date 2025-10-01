# VoteGuard - Enterprise Voting System

A comprehensive, enterprise-grade voting system built with Next.js, TypeScript, and Azure Database for PostgreSQL. This system demonstrates advanced Database Management System concepts with role-based access control, real-time election management, comprehensive audit capabilities, and enterprise-level security features.

## 🎓 Database Management System Project

This project showcases advanced database concepts for academic excellence:
- **Advanced Data Modeling**: Comprehensive ER design with 3NF normalization
- **ACID Compliance**: Full transaction management with consistency guarantees
- **Enterprise Security**: Multi-layered security with RBAC, audit trails, encryption
- **Performance Optimization**: Strategic indexing, connection pooling, query monitoring
- **Cloud Architecture**: Azure Database for PostgreSQL with scalable design
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
- **Database**: Azure Database for PostgreSQL Flexible Server
- **Authentication**: JWT with bcrypt, multi-layered security
- **Database Library**: Custom enhanced PostgreSQL library with pooling
- **Icons**: Lucide React
- **Deployment**: Azure App Service with CI/CD pipeline
- **Monitoring**: Built-in performance and security monitoring

## 📋 Prerequisites

- Node.js 18+ and npm
- Azure subscription (for Azure Database for PostgreSQL)
- Git
- Azure CLI (for database setup)

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

## 🚀 Quick Start (Azure Database)

### 1. Clone the repository
```bash
git clone <repository-url>
cd voting-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Azure Database Setup
Follow the comprehensive setup guide:
```bash
# See docs/AZURE_MIGRATION_GUIDE.md for detailed instructions
```

### 4. Environment Configuration
Copy the Azure environment template:
```bash
cp .env.azure .env.local
```

Update with your Azure Database credentials:
```env
AZURE_DATABASE_URL=postgresql://username:password@server.postgres.database.azure.com:5432/database?sslmode=require
DB_MAX_CONNECTIONS=20
ENABLE_AUDIT_LOGGING=true
ENABLE_SECURITY_MONITORING=true
```

### 5. Database Migration
Run the enhanced migration script:
```bash
node azure-migration.js
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

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

### Azure Deployment
This application is configured for deployment on Azure App Service with Azure PostgreSQL.

1. **Database**: Azure Database for PostgreSQL
2. **App Service**: Node.js runtime with continuous deployment
3. **Environment**: Configure app settings in Azure portal

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
