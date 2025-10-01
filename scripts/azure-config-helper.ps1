Write-Host "VoteGuard Azure Database Configuration" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

Write-Host ""
Write-Host "Your Azure Resources:" -ForegroundColor Yellow
Write-Host "- Database Server: voteguard-db-4824" 
Write-Host "- App Service: voteguard-webapp-7388"
Write-Host "- Resource Group: voteguard-rg (assumed)"

Write-Host ""
Write-Host "Steps to Configure Connection:" -ForegroundColor Yellow

Write-Host ""
Write-Host "1. Get Database Connection Details:" -ForegroundColor Cyan
Write-Host "   Go to Azure Portal and find PostgreSQL servers"
Write-Host "   Select voteguard-db-4824"
Write-Host "   Copy the Server name (ends with .postgres.database.azure.com)"
Write-Host "   Note the Admin username"

Write-Host ""
Write-Host "2. Reset Admin Password:" -ForegroundColor Cyan
Write-Host "   In your database server, go to Reset password"
Write-Host "   Set a strong password like: VoteGuard2024!"

Write-Host ""
Write-Host "3. Configure App Service Environment:" -ForegroundColor Cyan
Write-Host "   Go to App Services and select voteguard-webapp-7388"
Write-Host "   Go to Configuration section"
Write-Host "   Add the following Application Settings:"

Write-Host ""
Write-Host "Environment Variables to Add:" -ForegroundColor Green
Write-Host "DATABASE_URL=postgresql://[username]:[password]@voteguard-db-4824.postgres.database.azure.com:5432/postgres?sslmode=require"
Write-Host "AZURE_DATABASE_URL=postgresql://[username]:[password]@voteguard-db-4824.postgres.database.azure.com:5432/postgres?sslmode=require"
Write-Host "DB_HOST=voteguard-db-4824.postgres.database.azure.com"
Write-Host "DB_NAME=postgres"
Write-Host "DB_USER=[your_admin_username]"
Write-Host "DB_PASS=[your_password]"
Write-Host "DB_PORT=5432"
Write-Host "DB_SSL=require"
Write-Host "JWT_SECRET=voteguard_azure_jwt_secret_2024"
Write-Host "NODE_ENV=production"
Write-Host "ENABLE_AUDIT_LOGGING=true"

Write-Host ""
Write-Host "Next Steps After Configuration:" -ForegroundColor Yellow
Write-Host "1. Save App Service configuration"
Write-Host "2. Deploy enhanced database schema"
Write-Host "3. Run data migration from Supabase"
Write-Host "4. Test the application"

Write-Host ""
Write-Host "Ready to proceed!" -ForegroundColor Green