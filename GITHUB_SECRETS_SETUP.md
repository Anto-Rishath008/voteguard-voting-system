# GitHub Secrets Setup Guide for VoteGuard

## Required GitHub Repository Secrets

To enable proper deployment and database connectivity, you need to configure the following secrets in your GitHub repository.

### How to Add Secrets:
1. Go to your GitHub repository: `https://github.com/Anto-Rishath008/voteguard-voting-system`
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret below

---

## 🔧 Required Secrets

### 1. **AZURE_DATABASE_URL** (Primary Database Connection)
```
postgresql://username:password@hostname:5432/database_name?sslmode=require
```

**Example format:**
```
postgresql://voteguard_admin:YourStrongPassword123@voteguard-db-4824.postgres.database.azure.com:5432/voteguard_db?sslmode=require
```

**How to get this:**
1. Go to Azure Portal → Your PostgreSQL server
2. Click **Connection strings** in the left menu
3. Copy the **ADO.NET** or **JDBC** connection string
4. Convert to PostgreSQL format as shown above

### 2. **JWT_SECRET** (Authentication Token Security)
```
your-super-secure-jwt-secret-at-least-32-characters-long-for-production
```

**Generate a secure JWT secret:**
```bash
# Option 1: Use OpenSSL
openssl rand -base64 32

# Option 2: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. **AZURE_WEBAPP_PUBLISH_PROFILE** (Deployment)
```
<publishData>...</publishData>
```

**How to get this:**
1. Go to Azure Portal → Your App Service (`voteguard-webapp-7388`)
2. Click **Get publish profile** button
3. Open the downloaded `.PublishSettings` file
4. Copy the entire XML content

---

## 🔍 How to Find Your Azure Database Details

### Option 1: Azure Portal
1. Go to **Azure Portal** → **PostgreSQL servers**
2. Click your server name (`voteguard-db-4824`)
3. In **Overview**, note:
   - **Server name**: `voteguard-db-4824.postgres.database.azure.com`
   - **Admin username**: Usually `voteguard_admin` or similar
4. In **Connection security**:
   - **SSL settings**: Should be "Enabled"

### Option 2: From Your Working Local Setup
If your application works locally, check your `.env.local` file:
```bash
# Look for these variables in your local environment
DB_HOST=voteguard-db-4824.postgres.database.azure.com
DB_NAME=voteguard_db
DB_USER=voteguard_admin
DB_PASS=YourPassword123
DB_SSL=require
```

Convert these to the connection string format:
```
postgresql://[DB_USER]:[DB_PASS]@[DB_HOST]:5432/[DB_NAME]?sslmode=require
```

---

## 🧪 Testing the Connection

After adding the secrets, the next deployment will test the database connection. Look for these logs in GitHub Actions:

✅ **Success:**
```
🔗 Testing Azure Database connection...
✅ Database connection established
✅ Database query successful  
✅ Azure Database health check: SUCCESS
```

❌ **Failure:**
```
❌ Database error: connect ECONNREFUSED
❌ Connection string format should be: postgresql://user:password@host:port/database?sslmode=require
```

---

## 🔧 Alternative Configuration (Individual Variables)

If you prefer to use individual environment variables instead of a connection string, you can set these secrets:

```
DB_HOST=voteguard-db-4824.postgres.database.azure.com
DB_NAME=voteguard_db
DB_USER=voteguard_admin  
DB_PASS=YourPassword123
DB_PORT=5432
DB_SSL=require
```

The enhanced database will automatically detect and use whichever format you provide.

---

## 🚨 Security Notes

1. **Never commit secrets** to your repository
2. **Use strong passwords** for database access
3. **Rotate JWT secrets** periodically in production
4. **Limit database access** to specific IP ranges if possible
5. **Enable SSL/TLS** for all database connections

---

## 🔄 After Setup

Once you've added all the required secrets:

1. **Trigger a new deployment** by pushing any commit
2. **Monitor GitHub Actions** for successful database connection
3. **Test your live application** at: `https://voteguard-webapp-7388.azurewebsites.net`

The application should now work properly without 500/401 errors!