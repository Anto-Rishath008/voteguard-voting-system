# Azure Database for PostgreSQL Setup Guide
# VoteGuard Voting System - Database Management System Project

## Step 1: Create Azure Database for PostgreSQL Flexible Server

### Option A: Using Azure Portal (Recommended for Learning)
1. Go to Azure Portal (portal.azure.com)
2. Search "Azure Database for PostgreSQL"
3. Click "Create" → "Flexible server"
4. Configure:
   - **Resource Group**: Use existing or create new
   - **Server Name**: `voteguard-db-server`
   - **Region**: Same as your App Service
   - **PostgreSQL Version**: 14 or 15
   - **Compute + Storage**: Burstable, B1ms (1 vCore, 2 GiB RAM) - Cost effective
   - **Admin Username**: `voteguard_admin`
   - **Password**: Create secure password (save it!)

### Option B: Using Azure CLI
```bash
# Create resource group (if not exists)
az group create --name voteguard-rg --location eastus

# Create PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group voteguard-rg \
  --name voteguard-db-server \
  --location eastus \
  --admin-user voteguard_admin \
  --admin-password YourSecurePassword123! \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 14
```

## Step 2: Configure Firewall Rules
```bash
# Allow Azure services
az postgres flexible-server firewall-rule create \
  --resource-group voteguard-rg \
  --name voteguard-db-server \
  --rule-name AllowAllAzureIps \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Allow your current IP for development
az postgres flexible-server firewall-rule create \
  --resource-group voteguard-rg \
  --name voteguard-db-server \
  --rule-name AllowCurrentIP \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP
```

## Step 3: Get Connection String
After creation, your connection string will be:
```
postgresql://voteguard_admin:YourSecurePassword123!@voteguard-db-server.postgres.database.azure.com:5432/postgres?sslmode=require
```

## Step 4: Update Environment Variables
In Azure App Service → Configuration → Application Settings:
- `DATABASE_URL`: (connection string from Step 3)
- `DB_HOST`: voteguard-db-server.postgres.database.azure.com
- `DB_NAME`: postgres
- `DB_USER`: voteguard_admin
- `DB_PASS`: YourSecurePassword123!
- `DB_PORT`: 5432
- `DB_SSL`: require

## Academic Project Benefits:
✅ **Native Azure Integration** - Shows cloud database expertise
✅ **Production-Ready** - Real enterprise database service
✅ **Advanced Features** - Triggers, procedures, views, indexes
✅ **Security Features** - SSL, firewall, encryption
✅ **Monitoring & Backup** - Built-in Azure monitoring
✅ **Scalability** - Can scale compute and storage
✅ **Cost Management** - Pay-as-you-use pricing

## Next Steps:
1. Create the database server
2. Update connection strings in your application
3. Run migration scripts to set up enhanced schema
4. Test the connection and basic operations

This setup will provide a solid foundation for demonstrating advanced database management concepts in your academic project!