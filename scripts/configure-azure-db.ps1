# Azure Database Configuration Script
# This script helps configure the Azure Database connection for VoteGuard

Write-Host "🗄️ VoteGuard Azure Database Configuration" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# Database server details (based on your Azure resources)
$ServerName = "voteguard-db-4824"
$ResourceGroup = "voteguard-rg"  # Assuming this based on common naming
$AppServiceName = "voteguard-webapp-7388"

Write-Host "`n📋 Your Azure Resources:" -ForegroundColor Yellow
Write-Host "- Database Server: $ServerName" -ForegroundColor White
Write-Host "- App Service: $AppServiceName" -ForegroundColor White
Write-Host "- Resource Group: $ResourceGroup" -ForegroundColor White

Write-Host "`n🔧 Steps to Configure Connection:" -ForegroundColor Yellow

Write-Host "`n1. Get Database Connection Details:" -ForegroundColor Cyan
Write-Host "   Go to Azure Portal > PostgreSQL servers > $ServerName" -ForegroundColor White
Write-Host "   Copy the 'Server name' (should end with .postgres.database.azure.com)" -ForegroundColor White
Write-Host "   Note the 'Admin username' (you set this during creation)" -ForegroundColor White

Write-Host "`n2. Get/Reset Admin Password:" -ForegroundColor Cyan
Write-Host "   In Azure Portal > PostgreSQL servers > $ServerName > Reset password" -ForegroundColor White
Write-Host "   Set a strong password (e.g., VoteGuard2024)" -ForegroundColor White

Write-Host "`n3. Configure App Service Environment:" -ForegroundColor Cyan
Write-Host "   Azure Portal > App Services > $AppServiceName > Configuration" -ForegroundColor White

Write-Host "`n4. Add these Application Settings:" -ForegroundColor Cyan
@"
DATABASE_URL=postgresql://[admin_username]:[password]@[server_name].postgres.database.azure.com:5432/postgres?sslmode=require
AZURE_DATABASE_URL=postgresql://[admin_username]:[password]@[server_name].postgres.database.azure.com:5432/postgres?sslmode=require
DB_HOST=[server_name].postgres.database.azure.com
DB_NAME=postgres
DB_USER=[admin_username]
DB_PASS=[password]
DB_PORT=5432
DB_SSL=require
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
JWT_SECRET=voteguard_azure_jwt_secret_2024_secure_key
NODE_ENV=production
ENABLE_AUDIT_LOGGING=true
ENABLE_SECURITY_MONITORING=true
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=30
ENABLE_QUERY_METRICS=true
SLOW_QUERY_THRESHOLD=1000
"@ | Write-Host -ForegroundColor White

Write-Host "`n5. Example Connection String:" -ForegroundColor Cyan
Write-Host "   postgresql://voteguard_admin:VoteGuard2024!@voteguard-db-4824.postgres.database.azure.com:5432/postgres?sslmode=require" -ForegroundColor Green

Write-Host "`n🔥 Next Steps After Configuration:" -ForegroundColor Yellow
Write-Host "1. Save App Service configuration" -ForegroundColor White
Write-Host "2. Deploy enhanced database schema" -ForegroundColor White
Write-Host "3. Run data migration from Supabase" -ForegroundColor White
Write-Host "4. Test the application" -ForegroundColor White

Write-Host "`n🚀 Ready to proceed with schema deployment!" -ForegroundColor Green