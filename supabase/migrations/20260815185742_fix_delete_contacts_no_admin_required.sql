/*
# Corrige RPCs de exclusão de contatos

## Mudança
Remove a exigência de role 'admin' das funções delete_contacts e
delete_contacts_by_filter. Agora qualquer usuário autenticado que
pertença ao workspace pode excluir contatos daquele workspace.

A segurança continua garantida por:
1. auth.uid() deve ser não-nulo (autenticado)
2. current_workspace_id() deve retornar o workspace do chamador
3. Todos os contatos deletados devem pertencer ao mesmo workspace

A verificação de role 'admin' continua existindo para:
- Gestão de usuários (tela Usuários)
- Alteração de permissões
- Exclusão de importações (undo/purge)

Mas NÃO para exclusão de contatos do CRM.
*/

-- ============================================================================
-- delete_contacts — sem exigência de role admin
-- ============================================================================
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

  -- Valida que TODOS os contatos pertencem ao workspace do chamador.
  SELECT count(*) INTO v_count
  FROM public.contacts
  WHERE id = ANY(p_ids)
    AND workspace_id <> v_workspace_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Acesso negado: um ou mais contatos não pertencem ao seu workspace.';
  END IF;

  -- Coleta empresas afetadas para recalcular agregados depois.
  SELECT array_agg(DISTINCT company_id) INTO v_affected_company_ids
  FROM public.contacts
  WHERE id = ANY(p_ids)
    AND company_id IS NOT NULL;

  -- Deleta os contatos. CASCADE remove activities/eva_scheduling_state/saturday_requests.
  -- SET NULL preserva events e tasks (contact_id fica NULL).
  -- Empresas NÃO são tocadas.
  DELETE FROM public.contacts
  WHERE id = ANY(p_ids)
    AND workspace_id = v_workspace_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Recalcula agregados das empresas afetadas.
  IF v_affected_company_ids IS NOT NULL THEN
    PERFORM public.recompute_company_aggregates(cid)
    FROM unnest(v_affected_company_ids) AS cid;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_contacts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_contacts(uuid[]) TO authenticated;

-- ============================================================================
-- delete_contacts_by_filter — sem exigência de role admin
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_contacts_by_filter(
  p_q text DEFAULT NULL,
  p_stage text DEFAULT NULL,
  p_batch text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
  v_total integer;
  v_affected_company_ids uuid[];
  v_term text;
  v_batch_id uuid;
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

  -- Coleta empresas afetadas para recalcular agregados depois.
  SELECT array_agg(DISTINCT company_id) INTO v_affected_company_ids
  FROM public.contacts
  WHERE workspace_id = v_workspace_id
    AND deleted_at IS NULL
    AND (p_stage IS NULL OR p_stage = 'all' OR funnel_stage = p_stage)
    AND (
      v_batch_id IS NULL
      OR (v_batch_id = '00000000-0000-0000-0000-000000000000' AND import_batch_id IS NULL)
      OR import_batch_id = v_batch_id
    )
    AND (
      v_term IS NULL
      OR name ILIKE '%' || v_term || '%'
      OR company_name ILIKE '%' || v_term || '%'
      OR email ILIKE '%' || v_term || '%'
    )
    AND company_id IS NOT NULL;

  -- Deleta todos os contatos do filtro, atomicamente, no banco.
  DELETE FROM public.contacts
  WHERE workspace_id = v_workspace_id
    AND deleted_at IS NULL
    AND (p_stage IS NULL OR p_stage = 'all' OR funnel_stage = p_stage)
    AND (
      v_batch_id IS NULL
      OR (v_batch_id = '00000000-0000-0000-0000-000000000000' AND import_batch_id IS NULL)
      OR import_batch_id = v_batch_id
    )
    AND (
      v_term IS NULL
      OR name ILIKE '%' || v_term || '%'
      OR company_name ILIKE '%' || v_term || '%'
      OR email ILIKE '%' || v_term || '%'
    );

  GET DIAGNOSTICS v_total = ROW_COUNT;

  -- Recalcula agregados das empresas afetadas.
  IF v_affected_company_ids IS NOT NULL THEN
    PERFORM public.recompute_company_aggregates(cid)
    FROM unnest(v_affected_company_ids) AS cid;
  END IF;

  RETURN v_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_contacts_by_filter(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_contacts_by_filter(text, text, text) TO authenticated;
