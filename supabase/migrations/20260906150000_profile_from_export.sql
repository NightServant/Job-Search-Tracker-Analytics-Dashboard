-- The profile is imported from LinkedIn's own data export now, not read from a
-- URL. `linkedin_url` was written by the scraper that fed this table for about
-- an hour on 2026-09-06; nothing writes or reads it any more, and a column
-- nothing uses is a column the next reader has to work out the status of.
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS linkedin_url;

COMMENT ON TABLE public.user_profiles IS 'A user''s own professional profile, imported from their LinkedIn data export. May include an address and birth date, which that export carries.';
