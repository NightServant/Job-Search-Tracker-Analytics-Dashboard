-- Demo credentials are public, so read-only must be enforced in RLS.
-- A disabled button in the UI is an affordance, not a boundary.
CREATE TABLE IF NOT EXISTS public.demo_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read demo accounts" ON public.demo_accounts;
CREATE POLICY "Anyone can read demo accounts"
  ON public.demo_accounts FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.is_demo()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM demo_accounts WHERE user_id = auth.uid()) $$;

-- Re-create every write policy with the demo guard appended.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'jobs','resumes','resume_snapshots','application_documents',
    'events','activity_log','contacts','application_contacts',
    'user_preferences'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "demo_block_insert" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "demo_block_insert" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo())', t);

    EXECUTE format('DROP POLICY IF EXISTS "demo_block_update" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "demo_block_update" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_demo())', t);

    EXECUTE format('DROP POLICY IF EXISTS "demo_block_delete" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "demo_block_delete" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_demo())', t);
  END LOOP;
END $$;
