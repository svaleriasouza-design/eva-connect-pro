-- handle_new_user is an auth trigger function only; nobody should call it via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- current_workspace_id / has_role are needed by RLS policies for authenticated users only
REVOKE ALL ON FUNCTION public.current_workspace_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_workspace_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;