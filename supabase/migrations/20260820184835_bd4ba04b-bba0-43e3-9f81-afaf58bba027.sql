CREATE OR REPLACE FUNCTION public.delete_contacts(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_count integer;
  v_affected_company_ids uuid[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  v_workspace_id := public.current_workspace_id();
  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Seu usuário não possui um workspace.';
  END IF;

  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.contacts
  WHERE id = ANY(p_ids) AND workspace_id <> v_workspace_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Acesso negado: um ou mais contatos não pertencem ao seu workspace.';
  END IF;

  SELECT array_agg(DISTINCT company_id) INTO v_affected_company_ids
  FROM public.contacts
  WHERE id = ANY(p_ids) AND workspace_id = v_workspace_id AND company_id IS NOT NULL;

  DELETE FROM public.activities
    WHERE workspace_id = v_workspace_id AND contact_id = ANY(p_ids);
  DELETE FROM public.eva_scheduling_state
    WHERE workspace_id = v_workspace_id AND contact_id = ANY(p_ids);
  DELETE FROM public.saturday_requests
    WHERE workspace_id = v_workspace_id AND contact_id = ANY(p_ids);
  DELETE FROM public.campaign_targets
    WHERE workspace_id = v_workspace_id AND contact_id = ANY(p_ids);
  UPDATE public.tasks SET contact_id = NULL
    WHERE workspace_id = v_workspace_id AND contact_id = ANY(p_ids);
  UPDATE public.events SET contact_id = NULL
    WHERE workspace_id = v_workspace_id AND contact_id = ANY(p_ids);

  DELETE FROM public.contacts
  WHERE id = ANY(p_ids) AND workspace_id = v_workspace_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_affected_company_ids IS NOT NULL THEN
    PERFORM public.recompute_company_aggregates(cid)
    FROM unnest(v_affected_company_ids) AS cid;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_contacts(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_contacts(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_contacts(uuid[]) TO authenticated;