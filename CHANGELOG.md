# Changelog

All notable changes to the VoteGuard Voting System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-10-08

### Added
- Admin and SuperAdmin voting rights without requiring eligible_voters table entry
- Enhanced vote button visibility for all user roles
- Comprehensive LICENSE file (MIT License)
- CONTRIBUTING.md guidelines for open source collaboration
- GitHub Actions CI/CD workflow
- CHANGELOG.md for version tracking

### Changed
- Updated `/api/elections/[id]/contests` endpoint to allow admin voting eligibility
- Updated `/api/elections/[id]/vote` endpoint to support admin vote submission
- Improved role-based access control logic

### Fixed
- Vote button not appearing for admin accounts
- Admin users unable to cast votes in elections

### Security
- Maintained existing security protocols while extending admin voting capabilities
- All admin votes are logged and auditable

## [1.0.0] - 2025-10-07

### Added
- Initial release of VoteGuard Voting System
- Multi-role authentication (Voter, Admin, SuperAdmin)
- Secure voting with JWT-based authentication
- Real-time election results and analytics
- Election management dashboard for admins
- Voter eligibility management system
- Comprehensive audit logging
- Azure Database for PostgreSQL integration
- Responsive UI with Tailwind CSS
- Email notification support via Nodemailer
- SMS notification support via Twilio
- Vote encryption and hashing
- Protection against double voting
- Role-based access control (RBAC)
- Session management with secure cookies
- Database connection pooling
- Performance monitoring
- Security audit trails

### Database Schema
- Users table with role management
- Elections and contests tables
- Candidates table
- Votes table with encryption
- Eligible voters tracking
- Audit logs table
- User roles and permissions

### Security Features
- Password hashing with bcrypt
- JWT token authentication
- Vote anonymization
- HTTPS support
- CORS configuration
- SQL injection prevention
- XSS protection

### Documentation
- Comprehensive README with setup instructions
- Database schema documentation
- API endpoint documentation
- Security best practices guide
- Deployment instructions

---

## Template for Future Releases

## [Unreleased]

### Added
- New features that have been added

### Changed
- Changes in existing functionality

### Deprecated
- Features that will be removed in upcoming releases

### Removed
- Features that have been removed

### Fixed
- Bug fixes

### Security
- Security-related changes

---

## Release Types

- **Major version (X.0.0)**: Incompatible API changes
- **Minor version (0.X.0)**: New functionality in a backwards compatible manner
- **Patch version (0.0.X)**: Backwards compatible bug fixes
