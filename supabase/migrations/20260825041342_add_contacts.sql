-- Contact fields lived on jobs, so one recruiter spanning four applications
-- was stored four times with no link between them.
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  linkedin TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.application_contacts (
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_application_contacts_contact
  ON public.application_contacts(contact_id);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
CREATE POLICY "Users can view own contacts"
  ON public.contacts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own contacts" ON public.contacts;
CREATE POLICY "Users can insert own contacts"
  ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own contacts" ON public.contacts;
CREATE POLICY "Users can update own contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contacts;
CREATE POLICY "Users can delete own contacts"
  ON public.contacts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own application contacts" ON public.application_contacts;
CREATE POLICY "Users can view own application contacts"
  ON public.application_contacts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own application contacts" ON public.application_contacts;
CREATE POLICY "Users can insert own application contacts"
  ON public.application_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own application contacts" ON public.application_contacts;
CREATE POLICY "Users can delete own application contacts"
  ON public.application_contacts FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.application_contacts TO authenticated;
