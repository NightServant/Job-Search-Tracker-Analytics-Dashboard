-- Settings -> Profile takes a LinkedIn profile URL and renders what is on that
-- page. Both halves need somewhere to live: the URL, so it does not have to be
-- retyped, and the parsed result, so the panel has something to show on the
-- next visit.
--
-- CACHING THE RESULT IS THE POINT, not an optimisation. LinkedIn serves its
-- sign-in wall to most requests that do not come from a signed-in browser, so
-- a fetch that succeeded once is worth keeping -- otherwise the panel would be
-- empty on every visit where LinkedIn happened to say no.
--
-- NOTHING HERE IS A CREDENTIAL. This is a public URL and the public page it
-- points at: the person's own name, headline and work history. That is a
-- deliberate contrast with the Composio table this replaces, which held an
-- org-wide API key and was dropped the same day it was added.
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_url TEXT,
  -- The parsed UserProfile. JSONB rather than columns because the shape is
  -- read whole, never queried into, and every source fills a different subset.
  profile JSONB,
  fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_profiles IS 'A user''s own professional profile: the LinkedIn URL they gave and the public page parsed from it';

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
CREATE POLICY "Users can delete own profile"
  ON public.user_profiles FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
