# 🚀 Deployment Guide

> Complete step-by-step instructions for deploying the Job Search Tracker to production.

## 📋 Quick Checklist
- [ ] All tests passing: `npm test`
- [ ] Production build works: `npm run build`
- [ ] Supabase project created and credentials saved
- [ ] Database migrations applied (see [Database Migrations](#step-1-database-migrations))
- [ ] Edge functions deployed (job-url-autofill, resume-export-pdf, analytics-cache-proxy)
- [ ] Analytics cache table created
- [ ] Environment variables set in Vercel
- [ ] Smoke tests passed on production URL

---

## Table of Contents
1. [Pre-Deployment Setup](#pre-deployment-setup)
2. [Step 1: Database Migrations](#step-1-database-migrations)
3. [Step 2: Deploy Edge Functions](#step-2-deploy-edge-functions)
4. [Step 3: Vercel Deployment](#step-3-vercel-deployment)
5. [Step 4: Post-Deployment Verification](#step-4-post-deployment-verification)
6. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Setup

### ✅ Requirements
- [ ] GitHub account with push access to repo
- [ ] Vercel account (free tier OK)
- [ ] Supabase account (free tier OK)
- [ ] Node.js 18+ and npm installed
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Supabase project created at [supabase.com](https://supabase.com)

### Local Code Review

```bash
# Start dev server and spot-check features
npm run dev
# → Open http://localhost:5173
# → Create test job, verify Kanban drag-and-drop works
# → Check analytics dashboard loads

# Run all tests
npm test
# → Should show 200+ passing tests

# Build for production
npm run build
# → Should succeed with no TypeScript errors

# Optional: Check bundle size
ls -lh dist/assets/
# → Main bundle should be < 150KB gzipped
```

---

## Step 1: Database Migrations

### 📌 Important: Migrations Must Run First
Edge functions depend on database tables. **Run these before deploying functions.**

### Full Migration Guide
The complete, canonical database migration steps live in **[texts/database_migrations.md](texts/database_migrations.md)**.

**Key migrations to apply (in order):**

1. **Main schema** (jobs, job_status_history tables)
   - See: `texts/database_schema_v3_migration.txt`

2. **Resume feature** (resume_snapshots, resume_templates tables)
   - See: `texts/resumes_feature_migration.sql`

3. **RLS policies & constraints**
   - See: `texts/supabase_fix.sql`

4. **Analytics cache** (NEW - May 7, 2026)
   ```sql
   BEGIN;
   
   CREATE TABLE IF NOT EXISTS public.analytics_cache (
     user_id uuid NOT NULL,
     metric_name text NOT NULL,
     payload jsonb NOT NULL,
     updated_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (user_id, metric_name)
   );
   
   CREATE INDEX IF NOT EXISTS analytics_cache_updated_at_idx 
     ON public.analytics_cache (updated_at);
   
   CREATE OR REPLACE FUNCTION public.upsert_analytics_cache(
     p_user uuid, p_metric text, p_payload jsonb
   )
   RETURNS void LANGUAGE plpgsql AS $$
   BEGIN
     INSERT INTO public.analytics_cache (user_id, metric_name, payload, updated_at)
     VALUES (p_user, p_metric, p_payload, now())
     ON CONFLICT (user_id, metric_name) DO UPDATE
     SET payload = EXCLUDED.payload,
         updated_at = now();
   END;
   $$;
   
   COMMIT;
   ```

### How to Apply Migrations

**Via Supabase Dashboard (Easiest):**
1. Open [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Click **"New Query"**
5. Copy-paste each SQL migration above
6. Click **"Run"**
7. Verify success (no error messages)

**Via Supabase CLI:**
```bash
supabase db pull  # Download current schema
supabase db push  # Apply any pending migrations
```

---

## Step 2: Deploy Edge Functions

### 🔐 Authenticate Supabase CLI

```bash
# Interactive login (opens browser)
supabase login

# Link your local repo to Supabase project
supabase link --project-ref YOUR_PROJECT_REF
# → To find YOUR_PROJECT_REF: Open Supabase dashboard → Settings → General → Project Ref
```

### Deploy Functions

Deploy all 3 edge functions to Supabase:

```bash
supabase functions deploy job-url-autofill
supabase functions deploy resume-export-pdf
supabase functions deploy analytics-cache-proxy
```

You should see:
```
✓ Function deployed successfully
✓ Available at: https://YOUR_PROJECT.functions.supabase.co/job-url-autofill
```

### Optional: Set Supabase Secrets

For error monitoring on edge functions:

```bash
supabase secrets set EDGE_SENTRY_DSN=https://your-sentry-key@sentry.io/project
supabase secrets set EDGE_SENTRY_ENVIRONMENT=production
```

Or set via Supabase Dashboard:
1. Go to **Settings > Edge Functions > Secrets**
2. Add `EDGE_SENTRY_DSN` and `EDGE_SENTRY_ENVIRONMENT`

---

## Step 3: Vercel Deployment

### Option A: Automatic (Recommended)

```bash
# Just push to main — Vercel auto-deploys
git push origin main
```

Vercel will:
1. Trigger CI workflow
2. Run tests
3. Build for production
4. Deploy to vercel.app domain

### Option B: Manual Setup

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New...\" > \"Project\"**
3. **Import Git Repository**
   - Select your GitHub repo
   - Select `main` branch for production
   - (Optional) Select `develop` branch for preview deployments
4. **Configure Build Settings**
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Add Environment Variables**

   ```
   VITE_SUPABASE_URL = https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY = your-anon-key
   VITE_SENTRY_DSN = your-sentry-dsn (optional)
   VITE_SENTRY_ENVIRONMENT = production (optional)
   ```

6. Click **"Deploy"**

Vercel will build and deploy. Monitor the deployment in the **Deployments** tab.

---

## Step 4: Post-Deployment Verification

### 🧪 Smoke Tests (5-10 minutes)

#### 1. Site Is Live
```
Visit: https://your-project.vercel.app
✓ Page loads (no 404 or blank screen)
✓ No console errors (press F12 → Console)
✓ Dark/Light mode toggle works
```

#### 2. Authentication Flow
```
✓ Click "Sign In"
✓ Enter email and click sign-in link
✓ Redirected to dashboard
✓ User email shown in sidebar
✓ Page doesn't break when logged in
✓ Dark mode preference persists on refresh
```

#### 3. Job Management
```
✓ Click "Jobs" tab
✓ Add a new job (fill all fields)
✓ Verify job appears in list
✓ Drag job between Kanban columns
✓ Click a job to open details
✓ Edit job and save
✓ Delete job
```

#### 4. Analytics Dashboard
```
✓ Click "Dashboard" tab
✓ Charts load (may take 10-15s for compute on first request)
✓ No error messages
✓ Try different date ranges (if filter available)
```

#### 5. Resume Builder (Optional)
```
✓ Click "Resume" tab
✓ Enter resume content
✓ Click "Export PDF"
✓ PDF downloads successfully
```

### 📊 Verify Edge Functions Are Working

**Check Job Auto-fill:**
1. In dashboard, add a new job
2. Paste a LinkedIn or Indeed URL in the URL field
3. Click **"Auto-fill from URL"** (if button appears)
4. Job fields should populate automatically
5. If error: Edge function `job-url-autofill` may not have deployed

**Check Edge Logs:**
```bash
# View function invocations in real-time
supabase functions logs job-url-autofill

# Or in Supabase Dashboard: Functions → Select function → Logs tab
```

### 🎯 Monitor Performance

**Optional: Set Up Sentry Alerts**
- If you configured `VITE_SENTRY_DSN` in Vercel:
  1. Go to [sentry.io/organizations/your-org/issues](https://sentry.io)
  2. You should see errors (if any) from edge functions and browser
  3. Click an error to see stack trace and affected users

**View Analytics Cache Hits:**
- In Supabase dashboard:
  1. Go to **SQL Editor**
  2. Run:
     ```sql
     SELECT metric_name, COUNT(*), MAX(updated_at)
     FROM analytics_cache
     GROUP BY metric_name;
     ```
  3. Should show cached metrics with recent `updated_at` timestamps

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
