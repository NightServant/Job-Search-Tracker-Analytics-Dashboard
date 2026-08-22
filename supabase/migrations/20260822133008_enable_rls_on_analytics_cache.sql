-- analytics_cache is written/read only by the analytics-cache-proxy edge
-- function using the service role, which bypasses RLS. Enabling RLS with no
-- policies blocks all direct client access via the publishable key, which is
-- the intended posture for this table.
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;
