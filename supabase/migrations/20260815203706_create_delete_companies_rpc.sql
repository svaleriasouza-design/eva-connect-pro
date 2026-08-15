/*
# RPC para exclusão segura de empresas

## Comportamento
- Empresas são removidas permanentemente do banco.
- Contatos vinculados (contacts.company_id) ficam com company_id = NULL (SET NULL).
- Atividades vinculadas (activities.company_id) são removidas (CASCADE).
- Eventos vinculados (events.company_id) ficam com company_id = NULL (SET NULL).
- A empresa é removida apenas se pertencer ao workspace do chamador.

## Segurança
- SECURITY DEFINER com search_path = 'public'
- auth.uid() deve ser não-nulo
- current_workspace_id() deve retornar o workspace
- Todas as empresas devem pertencer ao workspace do chamador
*/

CREATE OR REPLACE FUNCTION public.delete_companies(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

  -- Valida que TODAS as empresas pertencem ao workspace do chamador.
  SELECT count(*) INTO v_count
  FROM public.companies
  WHERE id = ANY(p_ids)
    AND workspace_id <> v_workspace_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Acesso negado: uma ou mais empresas não pertencem ao seu workspace.';
  END IF;

  -- Deleta as empresas. O CASCADE do banco remove automaticamente:
  --   - activities (ON DELETE CASCADE)
  -- O SET NULL do banco preserva:
  --   - contacts (company_id fica NULL)
  --   - events (company_id fica NULL)
  DELETE FROM public.companies
  WHERE id = ANY(p_ids)
    AND workspace_id = v_workspace_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_companies(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_companies(uuid[]) TO authenticated;
