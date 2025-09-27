-- Simple setup script for Azure PostgreSQL
-- Connect to your database using Azure Data Studio or pgAdmin
-- Connection details:
-- Host: voteguard-db-4824.postgres.database.azure.com
-- Port: 5432
-- Database: voteguarddb
-- Username: voteguardadmin
-- Password: VoteGuard123!
-- SSL Mode: Require

-- After connecting, run the contents of src/database/schema.sql
-- Then optionally run src/database/seed.sql for sample data

-- Test connection:
SELECT 'Database connection successful!' as status, NOW() as connected_at;