-- Migration: Enforce Row-Level Security and work_mode constraint
-- Created: 2026-05-06
-- Purpose: Enable database-level data isolation and add work_mode validation
-- 
-- Safety: These operations are safe to run on existing databases
-- - work_mode constraint only loosens existing constraint (adds 'onsite')
-- - RLS policies only restrict access (never grant new access)
-- - No data is modified

BEGIN;

-- ============================================================================
-- 1. Allow 'onsite' in work_mode check constraint
-- ============================================================================
-- Safe: We're only adding to the enum, not removing values
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_work_mode_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_work_mode_check
  CHECK (work_mode IS NULL OR work_mode IN ('remote','hybrid','onsite'));

-- ============================================================================
-- 2. Enable Row-Level Security for jobs table
-- ============================================================================
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can only view their own jobs
DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
CREATE POLICY "Users can view own jobs"
  ON public.jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can only insert jobs for themselves
DROP POLICY IF EXISTS "Users can insert own jobs" ON public.jobs;
CREATE POLICY "Users can insert own jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can only update their own jobs
DROP POLICY IF EXISTS "Users can update own jobs" ON public.jobs;
CREATE POLICY "Users can update own jobs"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can only delete their own jobs
DROP POLICY IF EXISTS "Users can delete own jobs" ON public.jobs;
CREATE POLICY "Users can delete own jobs"
  ON public.jobs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 3. Enable Row-Level Security for job_status_history table
-- ============================================================================
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can only view their own status history
DROP POLICY IF EXISTS "Users can view own job status history" ON public.job_status_history;
CREATE POLICY "Users can view own job status history"
  ON public.job_status_history FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can only insert status history for their own jobs
DROP POLICY IF EXISTS "Users can insert own job status history" ON public.job_status_history;
CREATE POLICY "Users can insert own job status history"
  ON public.job_status_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can only delete their own status history
DROP POLICY IF EXISTS "Users can delete own job status history" ON public.job_status_history;
CREATE POLICY "Users can delete own job status history"
  ON public.job_status_history FOR DELETE
  USING (auth.uid() = user_id);

COMMIT;
