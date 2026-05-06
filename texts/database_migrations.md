# Database Migrations

This is the canonical source for database migration steps for production and staging environments.

## Before You Run Anything

1. Create a Supabase backup from **Database** → **Backups**.
2. Confirm you are connected to the correct Supabase project.
3. Apply migrations in the order below.

## Migration SQL

Run the following in the Supabase SQL Editor:

```sql
-- 1) Allow 'onsite' in work_mode check (safe: loosens constraint)
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_work_mode_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_work_mode_check
  CHECK (work_mode IS NULL OR work_mode IN ('remote','hybrid','onsite'));

-- 2) Enable Row-Level Security and add policies for jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
CREATE POLICY "Users can view own jobs"
  ON public.jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own jobs" ON public.jobs;
CREATE POLICY "Users can insert own jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own jobs" ON public.jobs;
CREATE POLICY "Users can update own jobs"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own jobs" ON public.jobs;
CREATE POLICY "Users can delete own jobs"
  ON public.jobs FOR DELETE
  USING (auth.uid() = user_id);

-- 3) Ensure job_status_history RLS + policies
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own job status history" ON public.job_status_history;
CREATE POLICY "Users can view own job status history"
  ON public.job_status_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own job status history" ON public.job_status_history;
CREATE POLICY "Users can insert own job status history"
  ON public.job_status_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own job status history" ON public.job_status_history;
CREATE POLICY "Users can delete own job status history"
  ON public.job_status_history FOR DELETE
  USING (auth.uid() = user_id);
```

## Verification

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('jobs', 'job_status_history');
```

Both tables should report `rowsecurity = true`.

## Post-Migration Check

1. Sign in with a test account.
2. Add a job and edit it.
3. Confirm a second account cannot see or edit the first account's jobs.