-- Revoke execution from public and anon for the security definer function
REVOKE ALL ON FUNCTION public.get_user_organizations() FROM public;
REVOKE ALL ON FUNCTION public.get_user_organizations() FROM anon;

-- Explicitly grant to roles that need it
GRANT EXECUTE ON FUNCTION public.get_user_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organizations() TO service_role;
