GRANT EXECUTE ON FUNCTION public.delete_contacts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_contacts_by_filter(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_companies(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_contacts(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_contacts_by_filter(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_companies(uuid[]) TO service_role;
REVOKE ALL ON FUNCTION public.delete_contacts_for_workspace(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_companies_for_workspace(uuid, uuid[]) FROM PUBLIC, anon, authenticated;