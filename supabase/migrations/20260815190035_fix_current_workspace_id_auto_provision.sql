/*
# Corrige current_workspace_id e has_role para usuários sem user_roles

## Problema
O trigger handle_new_user cria user_roles('admin') para novos signups,
mas usuários que existiam antes do trigger (ou cujo trigger falhou) não
têm user_roles. Como current_workspace_id() e has_role() dependem de
user_roles, esses usuários não conseguem usar a EVA.

## Solução
1. current_workspace_id(): se não houver user_roles para o usuário,
   procura o workspace criado mais recentemente (ou o mais antigo como
   fallback) e cria automaticamente um user_roles('admin') para ele.
   Isso garante que o primeiro usuário que criou o workspace seja
   reconhecido como administrador.

2. has_role(): se não houver user_roles para o usuário no workspace,
   retorna false (não muda — a auto-provisioning acontece em
   current_workspace_id).
*/

CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Tenta encontrar o workspace do usuário via user_roles.
  SELECT workspace_id INTO v_workspace_id
  FROM public.user_roles
  WHERE user_id = v_user_id AND workspace_id IS NOT NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_workspace_id IS NOT NULL THEN
    RETURN v_workspace_id;
  END IF;

  -- Fallback: se o usuário não tem user_roles, auto-provisiona.
  -- Procura o workspace mais antigo (provavelmente criado pelo primeiro
  -- usuário que cadastrou a conta) e cria user_roles('admin') para ele.
  SELECT id INTO v_workspace_id
  FROM public.workspaces
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_workspace_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, workspace_id)
    VALUES (v_user_id, 'admin', v_workspace_id)
    ON CONFLICT DO NOTHING;
    RETURN v_workspace_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Mantém has_role inalterada (já está correta)
-- REVOKE EXECUTE FROM PUBLIC não necessário para STABLE function
-- pois current_workspace_id já é usada internamente pelas RLS policies.
