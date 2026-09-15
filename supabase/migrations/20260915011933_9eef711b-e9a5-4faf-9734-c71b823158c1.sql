CREATE OR REPLACE FUNCTION public.delete_contacts_for_workspace(p_workspace_id uuid, p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_affected_company_ids uuid[];
BEGIN
  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Workspace obrigatório.';
  END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.contacts
  WHERE id = ANY(p_ids) AND workspace_id <> p_workspace_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Acesso negado: um ou mais contatos não pertencem ao workspace.';
  END IF;

  SELECT array_agg(DISTINCT company_id) INTO v_affected_company_ids
  FROM public.contacts
  WHERE id = ANY(p_ids) AND workspace_id = p_workspace_id AND company_id IS NOT NULL;

  DELETE FROM public.activities WHERE workspace_id = p_workspace_id AND contact_id = ANY(p_ids);
  DELETE FROM public.eva_scheduling_state WHERE workspace_id = p_workspace_id AND contact_id = ANY(p_ids);
  DELETE FROM public.saturday_requests WHERE workspace_id = p_workspace_id AND contact_id = ANY(p_ids);
  DELETE FROM public.campaign_targets WHERE workspace_id = p_workspace_id AND contact_id = ANY(p_ids);
  UPDATE public.tasks SET contact_id = NULL WHERE workspace_id = p_workspace_id AND contact_id = ANY(p_ids);
  UPDATE public.events SET contact_id = NULL WHERE workspace_id = p_workspace_id AND contact_id = ANY(p_ids);

  DELETE FROM public.contacts WHERE id = ANY(p_ids) AND workspace_id = p_workspace_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_affected_company_ids IS NOT NULL THEN
    PERFORM public.recompute_company_aggregates(cid) FROM unnest(v_affected_company_ids) AS cid;
    DELETE FROM public.companies co
    WHERE co.workspace_id = p_workspace_id
      AND co.id = ANY(v_affected_company_ids)
      AND NOT EXISTS (SELECT 1 FROM public.contacts c WHERE c.company_id = co.id);
  END IF;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_companies_for_workspace(p_workspace_id uuid, p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Workspace obrigatório.';
  END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.companies
  WHERE id = ANY(p_ids) AND workspace_id <> p_workspace_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Acesso negado: uma ou mais empresas não pertencem ao workspace.';
  END IF;

  DELETE FROM public.companies
  WHERE id = ANY(p_ids) AND workspace_id = p_workspace_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_contacts(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_contacts_by_filter(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_companies(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_contacts_for_workspace(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_companies_for_workspace(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_contacts_for_workspace(uuid, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_companies_for_workspace(uuid, uuid[]) TO service_role;