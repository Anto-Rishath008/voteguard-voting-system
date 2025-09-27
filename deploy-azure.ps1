# Azure Deployment Script for VoteGuard Voting System
# Run this script in PowerShell as Administrator

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup = "rg-voteguard-system",
    
    [Parameter(Mandatory=$true)]
    [string]$Location = "East US",
    
    [Parameter(Mandatory=$true)]
    [string]$DatabaseServerName = "voteguard-db-unique-$(Get-Random -Maximum 9999)",
    
    [Parameter(Mandatory=$true)]
    [string]$DatabaseName = "voteguarddb",
    
    [Parameter(Mandatory=$true)]
    [string]$DatabaseAdminUser = "voteguardadmin",
    
    [Parameter(Mandatory=$true)]
    [SecureString]$DatabaseAdminPassword,
    
    [Parameter(Mandatory=$true)]
    [string]$AppServicePlan = "asp-voteguard",
    
    [Parameter(Mandatory=$true)]
    [string]$WebAppName = "voteguard-webapp-$(Get-Random -Maximum 9999)",
    
    [Parameter(Mandatory=$false)]
    [string]$GitHubRepo = "https://github.com/Anto-Rishath008/voteguard-voting-system"
)

Write-Host "🚀 Starting Azure deployment for VoteGuard Voting System..." -ForegroundColor Green

# Check if Azure CLI is installed
try {
    az --version | Out-Null
    Write-Host "✅ Azure CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-windows" -ForegroundColor Yellow
    exit 1
}

# Login to Azure
Write-Host "🔐 Logging into Azure..." -ForegroundColor Blue
az login

# Convert SecureString to plain text for Azure CLI
$PlainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DatabaseAdminPassword))

# Create Resource Group
Write-Host "📁 Creating Resource Group: $ResourceGroup" -ForegroundColor Blue
az group create --name $ResourceGroup --location $Location

# Create PostgreSQL Flexible Server
Write-Host "🗄️ Creating PostgreSQL Database Server: $DatabaseServerName" -ForegroundColor Blue
az postgres flexible-server create `
    --resource-group $ResourceGroup `
    --name $DatabaseServerName `
    --location $Location `
    --admin-user $DatabaseAdminUser `
    --admin-password $PlainPassword `
    --sku-name Standard_B1ms `
    --tier Burstable `
    --storage-size 32 `
    --version 14

# Create Database
Write-Host "🗄️ Creating Database: $DatabaseName" -ForegroundColor Blue
az postgres flexible-server db create `
    --resource-group $ResourceGroup `
    --server-name $DatabaseServerName `
    --database-name $DatabaseName

# Configure Firewall Rules
Write-Host "🔥 Configuring Firewall Rules..." -ForegroundColor Blue
az postgres flexible-server firewall-rule create `
    --resource-group $ResourceGroup `
    --name $DatabaseServerName `
    --rule-name AllowAzureServices `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0

# Get current IP and allow it
$CurrentIP = (Invoke-WebRequest -Uri "https://ipinfo.io/ip" -UseBasicParsing).Content.Trim()
az postgres flexible-server firewall-rule create `
    --resource-group $ResourceGroup `
    --name $DatabaseServerName `
    --rule-name AllowMyIP `
    --start-ip-address $CurrentIP `
    --end-ip-address $CurrentIP

# Create App Service Plan
Write-Host "🌐 Creating App Service Plan: $AppServicePlan" -ForegroundColor Blue
az appservice plan create `
    --name $AppServicePlan `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku F1 `
    --is-linux

# Create Web App
Write-Host "🌐 Creating Web App: $WebAppName" -ForegroundColor Blue
az webapp create `
    --resource-group $ResourceGroup `
    --plan $AppServicePlan `
    --name $WebAppName `
    --runtime "NODE:18-lts"

# Configure Environment Variables
Write-Host "⚙️ Configuring Environment Variables..." -ForegroundColor Blue
$DatabaseConnectionString = "postgresql://$DatabaseAdminUser`:$PlainPassword@$DatabaseServerName.postgres.database.azure.com:5432/$DatabaseName`?sslmode=require"

az webapp config appsettings set `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --settings `
        DATABASE_URL=$DatabaseConnectionString `
        JWT_SECRET="voteguard-jwt-secret-$(Get-Random -Maximum 999999)" `
        NODE_ENV="production" `
        WEBSITES_PORT="3000"

# Configure GitHub Deployment
Write-Host "🔄 Configuring GitHub Deployment..." -ForegroundColor Blue
az webapp deployment source config `
    --resource-group $ResourceGroup `
    --name $WebAppName `
    --repo-url $GitHubRepo `
    --branch main `
    --manual-integration

Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Your Resources:" -ForegroundColor Yellow
Write-Host "• Resource Group: $ResourceGroup"
Write-Host "• Database Server: $DatabaseServerName.postgres.database.azure.com"
Write-Host "• Database Name: $DatabaseName"
Write-Host "• Web App URL: https://$WebAppName.azurewebsites.net"
Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run the database schema script (see AZURE_DEPLOYMENT.md)"
Write-Host "2. Test your application at: https://$WebAppName.azurewebsites.net"
Write-Host "3. Monitor logs: az webapp log tail --resource-group $ResourceGroup --name $WebAppName"
Write-Host ""
Write-Host "💰 Estimated Monthly Cost: ~$13 USD (using Azure Student Credits)" -ForegroundColor Green