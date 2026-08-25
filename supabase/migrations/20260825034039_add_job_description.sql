-- Full posting text. url alone is fragile: postings are taken down before
-- interviews, and keyword matching needs the body.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.jobs.description IS 'Full job posting text, used for ATS keyword matching and AI tailoring';
