-- salary_min/max were bare integers. Mixing PHP and USD in one column
-- silently corrupts every salary metric on the analytics page.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS salary_currency TEXT NOT NULL DEFAULT 'PHP';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_salary_currency_check') THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_salary_currency_check
      CHECK (salary_currency IN ('PHP','USD','EUR','GBP','SGD','AUD'));
  END IF;
END $$;

COMMENT ON COLUMN public.jobs.salary_currency IS 'ISO code for salary_min and salary_max; defaults to PHP';
