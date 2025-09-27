# Azure Deployment Guide for VoteGuard Voting System

## Prerequisites
- Azure Student Account with active credits
- Azure CLI installed locally
- Your GitHub repository: https://github.com/Anto-Rishath008/voteguard-voting-system

## Step 1: Install Azure CLI (if not already installed)

### Windows (PowerShell as Administrator):
```powershell
Invoke-WebRequest -Uri https://aka.ms/installazurecliwindows -OutFile .\AzureCLI.msi; Start-Process msiexec.exe -Wait -ArgumentList '/I AzureCLI.msi /quiet'; rm .\AzureCLI.msi
```

### Or download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-windows

## Step 2: Login to Azure
```bash
az login
az account show  # Verify you're using your student account
```

## Step 3: Set Variables (Customize these)
```bash
# Set these variables according to your preferences
RESOURCE_GROUP="rg-voteguard-system"
LOCATION="East US"  # or "West Europe", "Southeast Asia" etc.
DB_SERVER_NAME="voteguard-db-server"  # Must be globally unique
DB_NAME="voteguarddb"
DB_ADMIN_USER="voteguardadmin"
DB_ADMIN_PASSWORD="SecurePassword123!"  # Change this!
APP_SERVICE_PLAN="asp-voteguard"
WEB_APP_NAME="voteguard-webapp"  # Must be globally unique
```

## Step 4: Create Resource Group
```bash
az group create --name $RESOURCE_GROUP --location "$LOCATION"
```

## Step 5: Create PostgreSQL Database
```bash
# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location "$LOCATION" \
  --admin-user $DB_ADMIN_USER \
  --admin-password $DB_ADMIN_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 14

# Create the database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --database-name $DB_NAME

# Configure firewall to allow Azure services
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Allow your IP (run this from your local machine)
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --rule-name AllowMyIP \
  --start-ip-address $(curl -s https://ipinfo.io/ip) \
  --end-ip-address $(curl -s https://ipinfo.io/ip)
```

## Step 6: Create App Service Plan and Web App
```bash
# Create App Service Plan (Free tier for testing)
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --location "$LOCATION" \
  --sku F1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $WEB_APP_NAME \
  --runtime "NODE:18-lts" \
  --deployment-source-url https://github.com/Anto-Rishath008/voteguard-voting-system
```

## Step 7: Configure Environment Variables
```bash
# Database connection string
DB_CONNECTION_STRING="postgresql://$DB_ADMIN_USER:$DB_ADMIN_PASSWORD@$DB_SERVER_NAME.postgres.database.azure.com:5432/$DB_NAME?sslmode=require"

# Set application settings
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --settings \
    DATABASE_URL="$DB_CONNECTION_STRING" \
    JWT_SECRET="your-super-secret-jwt-key-change-this" \
    NODE_ENV="production" \
    NEXT_PUBLIC_SUPABASE_URL="https://$DB_SERVER_NAME.postgres.database.azure.com" \
    NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

## Step 8: Setup Database Schema
You'll need to run the schema.sql file against your Azure PostgreSQL database:

1. Install PostgreSQL client locally
2. Connect to your Azure database:
```bash
psql "postgresql://$DB_ADMIN_USER:$DB_ADMIN_PASSWORD@$DB_SERVER_NAME.postgres.database.azure.com:5432/$DB_NAME?sslmode=require"
```
3. Run the schema file: `\i src/database/schema.sql`

## Step 9: Configure Continuous Deployment
```bash
# Configure GitHub deployment
az webapp deployment source config \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --repo-url https://github.com/Anto-Rishath008/voteguard-voting-system \
  --branch main \
  --manual-integration
```

## Your Resources:
- **Database**: `$DB_SERVER_NAME.postgres.database.azure.com`
- **Web App**: `https://$WEB_APP_NAME.azurewebsites.net`
- **Resource Group**: `$RESOURCE_GROUP`

## Cost Estimation (Azure Student Credits):
- PostgreSQL Flexible Server (B1ms): ~$13/month
- App Service Plan (F1 Free): $0/month
- **Total**: ~$13/month (well within student credit limits)

## Next Steps:
1. Run these commands step by step
2. Update your application configuration for Azure
3. Test the deployment
4. Set up monitoring (Application Insights)