# Deployment Guide

## Table of Contents
1. [Pre-Deployment Setup](#pre-deployment-setup)
2. [Database Migration](#database-migration)
3. [Environment Configuration](#environment-configuration)
4. [Vercel Deployment](#vercel-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Setup

### Requirements
- [ ] GitHub account with push access
- [ ] Vercel account (free tier OK)
- [ ] Supabase project (production)
- [ ] Node.js 18+ locally
- [ ] All tests passing: `npm test`
- [ ] Production build verified: `npm run build`

### 1. Code Review Checklist
```bash
# Ensure all features are working
npm run dev

# Run full test suite
npm test

# Build for production
npm run build

# Check bundle size
ls -lh dist/assets/*.js | sort -k5 -h
```

### 2. Environment Variables
Create `.env.production` with:
```
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
VITE_SENTRY_DSN=your-sentry-dsn (optional)
VITE_SENTRY_ENVIRONMENT=production
```

---

## Database Migration

### Canonical Migration Doc

The full, canonical database migration checklist and SQL lives in [texts/database_migrations.md](texts/database_migrations.md). Keep migration edits there so the README and deployment docs do not drift.

---

## Environment Configuration

### 1. Supabase Edge Functions Setup
If using auto-fill and PDF export features:

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy job-url-autofill
supabase functions deploy resume-export-pdf
```

### 2. Vercel Configuration
In Vercel Dashboard:

1. **Import Project**
   - Connect GitHub repo
   - Select `main` branch for production
   - Select `develop` for preview (optional)

2. **Environment Variables**
   - Add `VITE_SUPABASE_URL`
   - Add `VITE_SUPABASE_ANON_KEY`
   - Add `VITE_SENTRY_DSN` (optional)
   - Add `VITE_SENTRY_ENVIRONMENT=production`

3. **Build Settings**
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

4. **Deployment**
   - Enable "Production branch auto-deploy"
   - Set to `main` branch

---

## Vercel Deployment

### Option 1: Automatic (Recommended)
Push to `main` branch on GitHub:
```bash
git checkout main
git pull origin main
# Make your changes
git add .
git commit -m "Describe your changes"
git push origin main
```

Vercel auto-deploys on push.

### Option 2: Manual
1. Go to Vercel Dashboard
2. Select your project
3. Click **Deployments**
4. Click **Redeploy** on desired deployment

### Deployment Logs
Monitor deployment in Vercel Console:
- Build logs
- Runtime errors
- Performance metrics

---

## Post-Deployment Verification

### Smoke Tests (5-10 minutes)

#### 1. Basic Functionality
```bash
# Visit https://your-domain.vercel.app
# You should see:
- ✅ Login page
- ✅ Dark mode toggle works
- ✅ No console errors
```

#### 2. Authentication
```bash
# Sign in with test account
- ✅ Login succeeds
- ✅ Redirected to dashboard
- ✅ User email shown in sidebar
- ✅ Dark mode persists after refresh
```

#### 3. Job Management
```bash
# Add a job
- ✅ Form saves without errors
- ✅ Job appears in Jobs tab
- ✅ Can edit job
- ✅ Can delete job
- ✅ Can export to CSV with all fields
```

#### 4. Analytics Dashboard
```bash
# View dashboard
- ✅ Status breakdown displays
- ✅ Charts load (may take 2-3 sec)
- ✅ Goal tracking works
- ✅ All metrics calculated correctly
```

#### 5. Security: Multi-Account Isolation
```bash
# Test account A
1. Sign in as test@account-a.com
2. Add 5 jobs with unique titles
3. Sign out

# Test account B
4. Sign in as test@account-b.com
5. Dashboard should be EMPTY (no jobs from Account A)
6. Add 3 jobs
7. Export CSV and verify only your 3 jobs
8. Sign out

# Verify Account A again
9. Sign in as test@account-a.com
10. Your 5 original jobs still there
11. No jobs from Account B visible
```

#### 6. Resume Builder
```bash
# Word editor
- ✅ Create new resume
- ✅ Type and edit content
- ✅ Auto-saves (check status message)
- ✅ Export PDF succeeds

# LaTeX editor
- ✅ Create LaTeX resume
- ✅ Edit source
- ✅ Live preview updates
- ✅ Toast notification appears (then auto-dismisses)
```

### Monitoring (First 24 Hours)

#### Check Logs
- Vercel: https://vercel.com/dashboard → select project → **Logs**
- Supabase: Go to project → **Database** → **Logs**
- Sentry: https://sentry.io → select project (if configured)

#### Edge Function Telemetry
- Set `EDGE_SENTRY_DSN` for server-side edge errors and slow-request alerts.
- Set `EDGE_SENTRY_ENVIRONMENT` if you want the edge events separated by environment.
- Watch for `edge_metric` JSON lines in Supabase function logs; they include request latency, throttle decisions, and DB connection counts.
- In Supabase, create alerts for function error spikes, HTTP 429 spikes, and database usage spikes so the emitted metrics become actionable notifications.

#### Key Metrics
- [ ] No 5xx errors
- [ ] Response times < 2s
- [ ] Database queries < 500ms
- [ ] Zero unhandled exceptions

---

## Troubleshooting

### Issue: "Cannot coerce the result to a single JSON object"
**Cause**: Using `.single()` when query returns no rows  
**Solution**: This should be fixed in code (use `.maybeSingle()`), but if you see it:
1. Check database has data for that user
2. Check RLS policies aren't blocking the query
3. Review `jobService.ts` for any `.single()` calls

### Issue: "Authentication required" on CSV export
**Cause**: Session expired  
**Solution**:
1. Sign out and sign back in
2. Try export again

### Issue: Resume PDF export fails
**Cause**: Edge function not deployed  
**Solution**:
```bash
supabase functions deploy resume-export-pdf
# Verify it's deployed in Supabase console
```

### Issue: Jobs from other accounts visible
**Cause**: RLS not enabled  
**Solution**: Run migration SQL again, verify policies exist

### Issue: Dark mode doesn't persist
**Cause**: LocalStorage disabled  
**Solution**: Check browser settings, try incognito mode

### Issue: Sidebar collapse doesn't persist
**Cause**: LocalStorage error  
**Solution**: Same as dark mode issue above

---

## Rollback Plan

If deployment breaks production:

### Immediate (< 5 min)
1. Go to Vercel Dashboard
2. Select project
3. Go to **Deployments**
4. Find last known-good deployment
5. Click **Redeploy**

### Database Rollback (< 10 min)
1. Go to Supabase console
2. Database → Backups
3. Restore from backup created before migration
4. Re-run any safe migrations

---

## Post-Launch Checklist

- [ ] Monitor Sentry for errors (24 hours)
- [ ] Confirm edge function telemetry is flowing to logs/Sentry
- [ ] Verify database backups run daily
- [ ] Set up Vercel analytics alerts
- [ ] Update user documentation
- [ ] Announce deployment
- [ ] Collect user feedback
- [ ] Plan next sprint

---

## Support

**Deployment Issues**: Check Vercel logs and Supabase status page  
**Data Issues**: Check Supabase query performance  
**UI Issues**: Browser console for errors, Sentry for production errors

Last updated: May 6, 2026
