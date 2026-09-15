CREATE OR REPLACE FUNCTION public.delete_contacts_by_filter(
  p_q text DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_batch text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_term text;
  v_batch_id uuid;
  v_ids uuid[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  v_workspace_id := public.current_workspace_id();
  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Seu usuário não possui um workspace.';
  END IF;

  v_term := COALESCE(NULLIF(TRIM(p_q), ''), NULL);
  v_batch_id := CASE
    WHEN p_batch IS NULL OR p_batch = 'all' OR p_batch = '' THEN NULL
    WHEN p_batch = 'none' THEN '00000000-0000-0000-0000-000000000000'::uuid
    ELSE p_batch::uuid
  END;

  SELECT array_agg(id) INTO v_ids
  FROM public.contacts
  WHERE workspace_id = v_workspace_id
    AND deleted_at IS NULL
    AND (p_stage IS NULL OR p_stage = 'all' OR funnel_stage = p_stage)
    AND (
      v_batch_id IS NULL
      OR (v_batch_id = '00000000-0000-0000-0000-000000000000'::uuid AND import_batch_id IS NULL)
      OR import_batch_id = v_batch_id
    )
    AND (
      v_term IS NULL
      OR name ILIKE '%' || v_term || '%'
      OR company_name ILIKE '%' || v_term || '%'
      OR email ILIKE '%' || v_term || '%'
    );

  IF v_ids IS NULL THEN
    RETURN 0;
  END IF;

  RETURN public.delete_contacts(v_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_contacts_by_filter(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_contacts_by_filter(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_contacts_by_filter(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_contacts_by_filter(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_companies(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_count integer;
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
  FROM public.companies
  WHERE id = ANY(p_ids)
    AND workspace_id <> v_workspace_id;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Acesso negado: uma ou mais empresas não pertencem ao seu workspace.';
  END IF;

  DELETE FROM public.companies
  WHERE id = ANY(p_ids)
    AND workspace_id = v_workspace_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_companies(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_companies(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_companies(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_companies(uuid[]) TO service_role;