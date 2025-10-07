# 🚀 Quick Vercel Deployment Checklist

## Before You Start
- [ ] GitHub repository is ready: ✅ https://github.com/Anto-Rishath008/voteguard-voting-system
- [ ] Have your database credentials ready
- [ ] Have your JWT secret ready (or generate one)

## 5-Minute Deployment Steps

### 1. Go to Vercel
Visit: **https://vercel.com/new**

### 2. Sign In with GitHub
- Click "Continue with GitHub"
- Authorize Vercel

### 3. Import Repository
- Select: `Anto-Rishath008/voteguard-voting-system`
- Click "Import"

### 4. Add Environment Variables
Click "Environment Variables" and add these **REQUIRED** variables:

| Variable | Example Value |
|----------|---------------|
| `DATABASE_URL` | `postgresql://user:pass@host.postgres.database.azure.com:5432/db?sslmode=require` |
| `JWT_SECRET` | `your_32_character_secret_key_here` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yourproject.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_supabase_key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `your_service_role_key` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` (update after first deploy) |

**Optional (for email/SMS):**
| Variable | Example Value |
|----------|---------------|
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | `your@email.com` |
| `EMAIL_PASSWORD` | `your_app_password` |
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | `your_token` |
| `TWILIO_PHONE_NUMBER` | `+1234567890` |

### 5. Click Deploy!
- Vercel will build and deploy (2-5 minutes)
- You'll get a URL like: `voteguard-voting-system.vercel.app`

### 6. Test Your Deployment
- Visit your Vercel URL
- Try logging in
- Test voting functionality

### 7. Update App URL
- Go back to Vercel → Settings → Environment Variables
- Update `NEXT_PUBLIC_APP_URL` to your actual Vercel URL
- Redeploy (click "Deployments" → "..." → "Redeploy")

## ✅ Done!
Your app is live! 🎉

## Common Issues & Quick Fixes

| Issue | Solution |
|-------|----------|
| Build fails | Check deployment logs, fix TypeScript errors |
| Database connection error | Verify DATABASE_URL, check Azure firewall |
| 500 errors | Check environment variables are set correctly |
| Login doesn't work | Verify JWT_SECRET is set |

## Need Help?
- 📖 Full guide: See `DEPLOYMENT.md`
- 🔧 Logs: Vercel Dashboard → Your Project → Deployments → View Function Logs
- 💬 Support: https://vercel.com/support

---

**Repository:** https://github.com/Anto-Rishath008/voteguard-voting-system
**Deployment Guide:** DEPLOYMENT.md (full details)
