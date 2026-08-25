-- resumes and jobs had no relationship, so "which CV did I send to Stripe?"
-- was unanswerable. snapshot_id pins the exact immutable version sent.
CREATE TABLE IF NOT EXISTS public.application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.resume_snapshots(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT application_documents_unique UNIQUE (job_id, resume_id)
);

COMMENT ON TABLE public.application_documents IS 'Which CV, and which snapshot of it, was sent to each application';

CREATE INDEX IF NOT EXISTS idx_application_documents_job
  ON public.application_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_user
  ON public.application_documents(user_id);

ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own application documents" ON public.application_documents;
CREATE POLICY "Users can view own application documents"
  ON public.application_documents FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own application documents" ON public.application_documents;
CREATE POLICY "Users can insert own application documents"
  ON public.application_documents FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own application documents" ON public.application_documents;
CREATE POLICY "Users can update own application documents"
  ON public.application_documents FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own application documents" ON public.application_documents;
CREATE POLICY "Users can delete own application documents"
  ON public.application_documents FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_documents TO authenticated;

-- describeLink renders a version number; resume_snapshots never stored one.
ALTER TABLE public.resume_snapshots
  ADD COLUMN IF NOT EXISTS version INTEGER;

COMMENT ON COLUMN public.resume_snapshots.version IS 'Monotonic per resume, assigned on insert; stable across deletes of other snapshots';

-- Backfill existing rows by creation order within each resume.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY resume_id ORDER BY created_at) AS rn
  FROM public.resume_snapshots
)
UPDATE public.resume_snapshots s
  SET version = ranked.rn
  FROM ranked
  WHERE ranked.id = s.id AND s.version IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resume_snapshots_version_unique') THEN
    ALTER TABLE public.resume_snapshots
      ADD CONSTRAINT resume_snapshots_version_unique UNIQUE (resume_id, version);
  END IF;
END $$;
