/*
# Funções RPC para exclusão segura de contatos

## Objetivo
Permitir exclusão permanente e atômica de contatos do CRM diretamente no banco,
sem depender da SUPABASE_SERVICE_ROLE_KEY. As funções rodam como SECURITY DEFINER
mas verificam o chamador via auth.uid() — apenas administradores do workspace
podem executá-las.

## Funções criadas
1. `delete_contacts(p_ids uuid[])` — exclui contatos específicos por ID.
2. `delete_contacts_by_filter(p_q text, p_stage text, p_batch text)` — exclui
   todos os contatos que correspondem ao filtro atual do CRM (busca, etapa,
   lote de importação), não apenas os visíveis na página.

## Comportamento de cascata
- `activities`, `eva_scheduling_state`, `saturday_requests`: ON DELETE CASCADE
  no banco — são removidas automaticamente.
- `events`, `tasks`: ON DELETE SET NULL — permanecem com contact_id = NULL.
- `companies`: NÃO são tocadas. A empresa é uma entidade própria do CRM e
  permanece intacta. Os agregados da empresa são recalculados após a exclusão.

## Segurança
- `SECURITY DEFINER` com `SET search_path = 'public'`.
- `auth.uid()` deve ser não-nulo (chamador autenticado).
- O chamador deve ter role `admin` no workspace atual (`has_role`).
- Todos os contatos deletados devem pertencer ao `current_workspace_id()`.
- `REVOKE EXECUTE FROM anon` — apenas `authenticated` pode chamar.
- Isolamento total entre workspaces.

## Notas
- A exclusão é atômica: ou todos os contatos são removidos ou nenhum.
- Após deletar, recalcula `recompute_company_aggregates` para cada empresa
  afetada, garantindo que `contacts_count` e campos derivados fiquem corretos.
- A função não altera eventos, tarefas, empresas, configurações de cadência,
  templates da Meta, usuários, nem dados globais do workspace.
*/

-- ============================================================================
-- 1. delete_contacts(p_ids) — exclusão por IDs explícitos
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

  IF NOT public.has_role(v_user_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir contatos.';
  END IF;

  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Valida que TODOS os contatos pertencem ao workspace do chamador.
  -- Se algum contato for de outro workspace, a função inteira falha.
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

  -- Deleta os contatos. O CASCADE do banco remove automaticamente:
  --   - activities (ON DELETE CASCADE)
  --   - eva_scheduling_state (ON DELETE CASCADE)
  --   - saturday_requests (ON DELETE CASCADE)
  -- O SET NULL do banco preserva:
  --   - events (contact_id fica NULL)
  --   - tasks (contact_id fica NULL)
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

REVOKE EXECUTE ON FUNCTION public.delete_contacts(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_contacts(uuid[]) TO authenticated;

-- ============================================================================
-- 2. delete_contacts_by_filter(p_q, p_stage, p_batch) — exclusão em massa por filtro
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
  v_count integer;
  v_total integer := 0;
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

  IF NOT public.has_role(v_user_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir contatos.';
  END IF;

  -- Pré-processa parâmetros para alinhar com a lógica do frontend.
  v_term := COALESCE(NULLIF(TRIM(p_q), ''), NULL);
  v_batch_id := CASE
    WHEN p_batch IS NULL OR p_batch = 'all' OR p_batch = '' THEN NULL
    WHEN p_batch = 'none' THEN '00000000-0000-0000-0000-000000000000'::uuid -- sentinel: batch IS NULL
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

  -- Deleta todos os contatos que correspondem ao filtro, de uma única vez,
  -- inteiramente no banco. O CASCADE cuida das tabelas dependentes.
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

REVOKE EXECUTE ON FUNCTION public.delete_contacts_by_filter(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_contacts_by_filter(text, text, text) TO authenticated;
