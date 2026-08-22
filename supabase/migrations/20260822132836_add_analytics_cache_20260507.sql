-- Migration: create analytics_cache table for precomputed user metrics
-- Run this in Supabase SQL editor or via psql


-- Table to store JSON payloads for per-user analytics metrics
CREATE TABLE IF NOT EXISTS public.analytics_cache (
  user_id uuid NOT NULL,
  metric_name text NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, metric_name)
);

-- Index to help purge stale entries
CREATE INDEX IF NOT EXISTS analytics_cache_updated_at_idx ON public.analytics_cache (updated_at);

-- Upsert helper: insert or update cache for a user/metric
CREATE OR REPLACE FUNCTION public.upsert_analytics_cache(p_user uuid, p_metric text, p_payload jsonb)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.analytics_cache (user_id, metric_name, payload, updated_at)
  VALUES (p_user, p_metric, p_payload, now())
  ON CONFLICT (user_id, metric_name) DO UPDATE
  SET payload = EXCLUDED.payload,
      updated_at = now();
END;
$$;


-- Example queries you can run in Supabase SQL editor:
-- 1) Read cached metric for a user:
-- SELECT payload FROM public.analytics_cache WHERE user_id = 'USER_UUID' AND metric_name = 'timeInStage';

-- 2) Upsert (from SQL) a payload for a user/metric:
-- SELECT public.upsert_analytics_cache('USER_UUID'::uuid, 'timeInStage', '{"example": true}'::jsonb);

-- 3) Purge stale cache older than N minutes (example 60 minutes):
-- DELETE FROM public.analytics_cache WHERE updated_at < now() - interval '60 minutes';
