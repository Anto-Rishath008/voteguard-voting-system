# Vercel Deployment Guide for VoteGuard

This guide will help you deploy your VoteGuard Voting System to Vercel.

## Prerequisites

1. ✅ GitHub repository created: https://github.com/Anto-Rishath008/voteguard-voting-system
2. ✅ Vercel account (sign up at https://vercel.com if you don't have one)
3. ✅ PostgreSQL database (Azure Database for PostgreSQL or similar)

## Step-by-Step Deployment

### 1. Sign Up / Log In to Vercel

1. Go to https://vercel.com
2. Click "Sign Up" or "Log In"
3. **Important:** Choose "Continue with GitHub" to connect your GitHub account
4. Authorize Vercel to access your GitHub repositories

### 2. Import Your Project

1. Once logged in, click "Add New..." → "Project"
2. You'll see a list of your GitHub repositories
3. Find `voteguard-voting-system` and click "Import"
4. Vercel will automatically detect it's a Next.js project

### 3. Configure Project Settings

#### Framework Preset
- **Framework:** Next.js (auto-detected)
- **Root Directory:** `./` (leave as default)
- **Build Command:** `npm run build` (auto-filled)
- **Output Directory:** `.next` (auto-filled)
- **Install Command:** `npm install` (auto-filled)

#### Environment Variables (CRITICAL!)

Click "Environment Variables" and add the following:

**Required Variables:**

```env
DATABASE_URL=postgresql://username:password@your-server.postgres.database.azure.com:5432/dbname?sslmode=require
```

```env
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Optional Variables (if using email/SMS):**

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@voteguard.com
```

```env
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

**App Configuration:**

```env
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NODE_ENV=production
```

### 4. Deploy!

1. After adding environment variables, click **"Deploy"**
2. Vercel will:
   - ✅ Clone your repository
   - ✅ Install dependencies
   - ✅ Build your Next.js application
   - ✅ Deploy to production

3. Deployment usually takes 2-5 minutes

### 5. Post-Deployment Steps

#### A. Verify Deployment
1. Once deployed, Vercel will provide a URL like: `https://voteguard-voting-system.vercel.app`
2. Click "Visit" to open your deployed application
3. Test the login and voting functionality

#### B. Update Environment Variables (if needed)
1. Go to your project dashboard in Vercel
2. Click "Settings" → "Environment Variables"
3. Update `NEXT_PUBLIC_APP_URL` to your actual Vercel URL

#### C. Set Up Custom Domain (Optional)
1. Go to "Settings" → "Domains"
2. Add your custom domain (e.g., `voteguard.com`)
3. Follow DNS configuration instructions
4. Vercel provides free SSL certificates automatically

### 6. Database Setup

**Important:** Ensure your PostgreSQL database is accessible from Vercel:

1. **Allow Vercel IPs:**
   - In Azure Portal, go to your PostgreSQL server
   - Navigate to "Connection security"
   - Add Vercel's IP ranges or enable "Allow access to Azure services"

2. **SSL Configuration:**
   - Azure PostgreSQL requires SSL
   - Ensure your connection string includes `?sslmode=require`

3. **Run Database Migrations:**
   ```bash
   # If migrations haven't been run yet
   # Connect to your database and run:
   psql -h your-server.postgres.database.azure.com -U username -d dbname -f database/enhanced_schema.sql
   ```

### 7. Continuous Deployment

Vercel automatically sets up continuous deployment:

- ✅ Every push to `main` branch triggers a production deployment
- ✅ Pull requests get preview deployments
- ✅ Automatic rollbacks if deployment fails

To deploy updates:
```bash
git add .
git commit -m "your changes"
git push origin main
```

Vercel will automatically redeploy!

## Troubleshooting

### Build Failures

**Issue:** Build fails with TypeScript errors
- **Solution:** Run `npm run build` locally first to catch errors
- Fix all TypeScript errors before pushing

**Issue:** Missing environment variables
- **Solution:** Double-check all required env vars are set in Vercel dashboard

### Runtime Errors

**Issue:** Database connection fails
- **Solution:** 
  - Verify DATABASE_URL is correct
  - Check Azure firewall rules allow Vercel IPs
  - Ensure SSL is properly configured

**Issue:** JWT authentication fails
- **Solution:**
  - Verify JWT_SECRET is set
  - Ensure it's the same secret used for token generation
  - Check token expiration settings

### Performance Issues

**Issue:** Slow API responses
- **Solution:**
  - Check database connection pooling
  - Optimize queries
  - Consider upgrading Vercel plan or database tier

## Vercel CLI (Alternative Method)

You can also deploy using Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd voting-system
vercel

# Follow prompts
# Link to existing project or create new one
# Set up environment variables when prompted
```

## Environment-Specific Deployments

### Production (main branch)
- URL: `https://voteguard-voting-system.vercel.app`
- Auto-deploys from `main` branch

### Preview (feature branches)
- Create a new branch: `git checkout -b feature/new-feature`
- Push to GitHub: `git push origin feature/new-feature`
- Vercel creates preview deployment automatically
- Get unique URL for testing

## Monitoring & Analytics

1. **Vercel Dashboard:**
   - View deployment logs
   - Monitor function execution
   - Check error rates

2. **Set Up Analytics:**
   - Go to "Analytics" in Vercel dashboard
   - Enable Web Analytics (free)
   - Track page views, performance metrics

3. **Set Up Logging:**
   - Integrate with services like:
     - Sentry (error tracking)
     - LogRocket (session replay)
     - Datadog (monitoring)

## Security Checklist

- ✅ All environment variables are set in Vercel (not in code)
- ✅ `.env.local` is in `.gitignore`
- ✅ Database credentials are secure
- ✅ JWT secret is strong (min 32 characters)
- ✅ CORS headers are properly configured
- ✅ SSL/HTTPS is enabled (automatic on Vercel)
- ✅ Database firewall rules are configured
- ✅ API routes have proper authentication

## Cost Optimization

**Free Tier Includes:**
- Unlimited deployments
- 100 GB bandwidth per month
- Serverless functions
- Automatic SSL
- Preview deployments

**If you need more:**
- Consider Vercel Pro ($20/month)
- Or optimize to stay within free tier:
  - Optimize images
  - Enable caching
  - Reduce function execution time

## Useful Vercel Commands

```bash
# View deployment logs
vercel logs

# List deployments
vercel ls

# Inspect deployment
vercel inspect <deployment-url>

# Remove deployment
vercel rm <deployment-name>

# Set environment variable
vercel env add <NAME>
```

## Additional Resources

- 📖 [Vercel Documentation](https://vercel.com/docs)
- 📖 [Next.js Deployment](https://nextjs.org/docs/deployment)
- 📖 [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- 📖 [Custom Domains](https://vercel.com/docs/concepts/projects/custom-domains)

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review this guide
3. Check Vercel Status: https://www.vercel-status.com
4. Vercel Support: https://vercel.com/support

---

**Ready to Deploy!** 🚀

Just go to https://vercel.com and import your repository!
