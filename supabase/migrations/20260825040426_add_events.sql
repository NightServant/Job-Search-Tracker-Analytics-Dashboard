-- date_applied was the only date in the system. Interviews, offer deadlines
-- and take-home due dates had nowhere to live.
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('interview','deadline','take_home','follow_up','other')),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.events IS 'Scheduled items: interviews, deadlines, take-homes';

CREATE INDEX IF NOT EXISTS idx_events_user_starts ON public.events(user_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_events_job ON public.events(job_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own events" ON public.events;
CREATE POLICY "Users can view own events"
  ON public.events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own events" ON public.events;
CREATE POLICY "Users can insert own events"
  ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own events" ON public.events;
CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own events" ON public.events;
CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
