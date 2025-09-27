# VoteGuard - Secure Voting System

A comprehensive, secure voting system built with Next.js, TypeScript, and PostgreSQL. This system provides role-based access control for voters, administrators, and super administrators with real-time election management and audit capabilities.

## 🚀 Features

- **Role-Based Authentication**: Support for Voters, Admins, and Super Admins
- **Election Management**: Create, manage, and monitor elections
- **Secure Voting**: Encrypted vote storage with audit trails
- **Real-time Results**: Live election results and analytics
- **Admin Dashboard**: Comprehensive election and user management
- **Audit Logging**: Complete activity tracking for security compliance
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (Supabase/Azure)
- **Authentication**: JWT with bcrypt
- **Icons**: Lucide React
- **Deployment**: Azure App Service

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone <repository-url>
cd voting-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
DATABASE_URL=your_database_url
```

### 4. Database Setup
Run the database schema and seed files:
```bash
# Initialize database schema
psql -d your_database -f src/database/schema.sql

# Seed initial data (optional)
psql -d your_database -f src/database/seed.sql
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
