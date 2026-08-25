-- Settings needs a user-level default currency. jobs.salary_currency is
-- per-row with a hardcoded default, so there was nowhere to store intent.
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_currency TEXT NOT NULL DEFAULT 'PHP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_preferences IS 'Per-user settings; one row per user, created lazily on first write';
COMMENT ON COLUMN public.user_preferences.default_currency IS 'Seeds jobs.salary_currency for new applications';

-- Same vocabulary as jobs_salary_currency_check. Keep the two in step.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_currency_check') THEN
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT user_preferences_currency_check
      CHECK (default_currency IN ('PHP','USD','EUR','GBP','SGD','AUD'));
  END IF;
END $$;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
