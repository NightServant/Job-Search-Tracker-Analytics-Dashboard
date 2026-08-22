-- Pin search_path on trigger/helper functions so they cannot resolve
-- objects through a caller-controlled search_path.
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.log_job_status_change() SET search_path = public;
ALTER FUNCTION public.upsert_analytics_cache(uuid, text, jsonb) SET search_path = public;
