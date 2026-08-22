-- resume_snapshots: version history for the Resume Builder.
-- Schema derived from src/services/resumeSnapshotService.ts, which was
-- shipped without a corresponding migration.
CREATE TABLE IF NOT EXISTS public.resume_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Tiptap JSONContent, or {"type":"latex","source":"..."} for latex mode
  content JSONB NOT NULL,
  -- Declared optional in ResumeSnapshotMeta; not yet written by the app
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.resume_snapshots IS 'Immutable version history for resumes; capped at 10 per resume by the application';

-- Serves the hot query: .eq(resume_id).eq(user_id).order(created_at desc)
CREATE INDEX IF NOT EXISTS idx_resume_snapshots_resume_user_created
  ON public.resume_snapshots(resume_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resume_snapshots_user_id
  ON public.resume_snapshots(user_id);

ALTER TABLE public.resume_snapshots ENABLE ROW LEVEL SECURITY;

-- No UPDATE policy: the service never updates snapshots, so they stay immutable.
DROP POLICY IF EXISTS "Users can view own resume snapshots" ON public.resume_snapshots;
CREATE POLICY "Users can view own resume snapshots"
  ON public.resume_snapshots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own resume snapshots" ON public.resume_snapshots;
CREATE POLICY "Users can insert own resume snapshots"
  ON public.resume_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own resume snapshots" ON public.resume_snapshots;
CREATE POLICY "Users can delete own resume snapshots"
  ON public.resume_snapshots FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.resume_snapshots TO authenticated;
