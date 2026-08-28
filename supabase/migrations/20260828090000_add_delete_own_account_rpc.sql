-- Settings' danger zone needs a way for a signed-in user to remove their own
-- account. The client SDK has no self-service delete -- auth.admin.deleteUser
-- needs the service role key, which must never reach the browser -- so this
-- runs the delete server-side instead, as a SECURITY DEFINER function owned
-- by a role with access to auth.users.
--
-- Every user-owned table already cascades ON DELETE from auth.users (jobs,
-- resumes, resume_snapshots, application_documents, events, activity_log,
-- contacts, application_contacts, user_preferences), so removing the
-- auth.users row is sufficient on its own -- there is nothing left to clean
-- up by hand.
--
-- THE DEMO GUARD IS LOAD-BEARING, AND RLS CANNOT PROVIDE IT HERE.
-- 20260825043057 protects demo accounts with RESTRICTIVE policies carrying
-- `NOT public.is_demo()`, but a SECURITY DEFINER function runs as its owner
-- and does not consult those policies at all. Without the explicit check
-- below, a demo user -- whose credentials are deliberately public -- could
-- delete the shared demo account, and the ON DELETE CASCADE described above
-- would take every seeded job, CV, event and contact with it. That is the
-- whole public demo, destroyed by anyone who found the button. The same file
-- states the principle this guard exists to honour: a disabled button in the
-- UI is an affordance, not a boundary.
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF public.is_demo() THEN
    RAISE EXCEPTION 'The demo account cannot be deleted'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
