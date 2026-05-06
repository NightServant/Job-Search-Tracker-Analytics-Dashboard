-- Job Search Tracker — Supabase Migration (V3)
-- Adds: contact tracking fields, tags/filters fields, and job status history.
-- Copy/paste this entire file into Supabase → SQL Editor, then Run.
-- Safe to run after V2.

-- -----------------------------------------------------------------------------
-- 1) JOBS TABLE: NEW COLUMNS
-- -----------------------------------------------------------------------------

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_linkedin TEXT,
  ADD COLUMN IF NOT EXISTS contact_notes TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS work_mode TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS is_referral BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tech_stack TEXT[] NOT NULL DEFAULT '{}';

-- -----------------------------------------------------------------------------
-- 2) JOBS TABLE: CONSTRAINTS
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'jobs_work_mode_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_work_mode_check
      CHECK (work_mode IS NULL OR work_mode IN ('remote', 'hybrid', 'onsite'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3) STATUS HISTORY TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.job_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_status VARCHAR(50) NOT NULL CHECK (
    from_status IN ('wishlist', 'applied', 'interviewing', 'offer', 'rejected')
  ),
  to_status VARCHAR(50) NOT NULL CHECK (
    to_status IN ('wishlist', 'applied', 'interviewing', 'offer', 'rejected')
  ),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4) STATUS HISTORY INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id
  ON public.job_status_history(job_id);

-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_job_status_history_user_id
  ON public.job_status_history(user_id);

-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_job_status_history_changed_at
  ON public.job_status_history(changed_at);

-- -----------------------------------------------------------------------------
-- 5) STATUS HISTORY RLS + POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own job status history" ON public.job_status_history;

CREATE POLICY "Users can view own job status history"
  ON public.job_status_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can insert own job status history" ON public.job_status_history;

CREATE POLICY "Users can insert own job status history"
  ON public.job_status_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can delete own job status history" ON public.job_status_history;

CREATE POLICY "Users can delete own job status history"
  ON public.job_status_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6) TRIGGER: AUTO-LOG STATUS CHANGES
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.job_status_history (
      job_id,
      user_id,
      from_status,
      to_status,
      changed_at
    ) VALUES (
      NEW.id,
      NEW.user_id,
      OLD.status,
      NEW.status,
      NEW.updated_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS job_status_change_trigger ON public.jobs;

CREATE TRIGGER job_status_change_trigger
AFTER UPDATE OF status ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.log_job_status_change();
