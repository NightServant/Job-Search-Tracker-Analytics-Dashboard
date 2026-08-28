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
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
