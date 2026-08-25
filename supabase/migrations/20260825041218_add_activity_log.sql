-- job_status_history covers status transitions only. Nothing recorded
-- "recruiter called", "sent thank-you", "asked about timeline".
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.activity_log IS 'Free-form timestamped notes per application';

CREATE INDEX IF NOT EXISTS idx_activity_log_job_time
  ON public.activity_log(job_id, occurred_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_log;
CREATE POLICY "Users can view own activity"
  ON public.activity_log FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity_log;
CREATE POLICY "Users can insert own activity"
  ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own activity" ON public.activity_log;
CREATE POLICY "Users can update own activity"
  ON public.activity_log FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own activity" ON public.activity_log;
CREATE POLICY "Users can delete own activity"
  ON public.activity_log FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
