-- 1. Proprietário do workspace
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.workspaces w
SET owner_user_id = sub.user_id
FROM (
  SELECT DISTINCT ON (workspace_id) workspace_id, user_id
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY workspace_id, created_at ASC
) sub
WHERE sub.workspace_id = w.id AND w.owner_user_id IS NULL;

-- 2. Limpeza: workspace pessoal vazio de quem também é membro de outro workspace
WITH multi AS (
  SELECT user_id FROM public.user_roles GROUP BY user_id HAVING count(DISTINCT workspace_id) > 1
), personal_empty AS (
  SELECT w.id
  FROM public.workspaces w
  JOIN multi m ON m.user_id = w.owner_user_id
  WHERE (SELECT count(*) FROM public.user_roles r WHERE r.workspace_id = w.id) = 1
    AND NOT EXISTS (SELECT 1 FROM public.contacts c WHERE c.workspace_id = w.id)
    AND NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.workspace_id = w.id)
    AND NOT EXISTS (SELECT 1 FROM public.activities a WHERE a.workspace_id = w.id)
    AND NOT EXISTS (SELECT 1 FROM public.events e WHERE e.workspace_id = w.id)
    AND NOT EXISTS (SELECT 1 FROM public.tasks t WHERE t.workspace_id = w.id)
    AND NOT EXISTS (SELECT 1 FROM public.campaigns cp WHERE cp.workspace_id = w.id)
    AND NOT EXISTS (SELECT 1 FROM public.whatsapp_numbers n WHERE n.workspace_id = w.id)
)
DELETE FROM public.user_roles WHERE workspace_id IN (SELECT id FROM personal_empty);

DELETE FROM public.cadence_steps WHERE workspace_id NOT IN (SELECT workspace_id FROM public.user_roles);
DELETE FROM public.cadence_settings WHERE workspace_id NOT IN (SELECT workspace_id FROM public.user_roles);
DELETE FROM public.workspace_settings WHERE workspace_id NOT IN (SELECT workspace_id FROM public.user_roles);
DELETE FROM public.meta_wa_settings WHERE workspace_id NOT IN (SELECT workspace_id FROM public.user_roles);
DELETE FROM public.import_batches WHERE workspace_id NOT IN (SELECT workspace_id FROM public.user_roles);
DELETE FROM public.workspaces WHERE id NOT IN (SELECT workspace_id FROM public.user_roles);

-- Restaura acesso de quem ficou bloqueado sem assinatura própria (usuário adicional)
UPDATE public.platform_access pa
SET access_revoked = false
WHERE pa.access_revoked = true
  AND EXISTS (
    SELECT 1 FROM public.user_roles r
    JOIN public.workspaces w ON w.id = r.workspace_id
    WHERE r.user_id = pa.user_id AND w.owner_user_id IS DISTINCT FROM pa.user_id
  );

-- 3. Workspace do usuário (1 login = 1 workspace)
CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.workspace_id
  FROM public.user_roles r
  JOIN public.workspaces w ON w.id = r.workspace_id
  WHERE r.user_id = auth.uid()
  ORDER BY (w.owner_user_id = auth.uid()) DESC, r.created_at ASC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_workspace_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_workspace_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.workspace_owner_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT w.owner_user_id
  FROM public.user_roles r
  JOIN public.workspaces w ON w.id = r.workspace_id
  WHERE r.user_id = _user_id
  ORDER BY (w.owner_user_id = _user_id) DESC, r.created_at ASC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.workspace_owner_for_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workspace_owner_for_user(uuid) TO authenticated, service_role;

-- 4. Acesso: usuário adicional herda a assinatura do proprietário
CREATE OR REPLACE FUNCTION public.has_app_access(_user_id uuid, check_env text DEFAULT 'live'::text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r public.platform_access;
  v_owner uuid;
BEGIN
  SELECT * INTO r FROM public.platform_access WHERE user_id = _user_id;
  IF r.is_platform_admin THEN RETURN true; END IF;
  IF r.access_revoked THEN RETURN false; END IF;
  IF r.vip THEN RETURN true; END IF;
  IF r.trial_ends_at IS NOT NULL AND r.trial_ends_at > now() THEN RETURN true; END IF;
  IF public.has_active_subscription(_user_id, check_env) THEN RETURN true; END IF;

  v_owner := public.workspace_owner_for_user(_user_id);
  IF v_owner IS NOT NULL AND v_owner <> _user_id THEN
    RETURN public.has_app_access(v_owner, check_env);
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.has_app_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_app_access(uuid, text) TO authenticated, service_role;

-- 5. Cadastro: convite entra direto no workspace do proprietário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
  v_ws uuid;
  v_invited uuid;
  v_role app_role;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, v_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.platform_access (user_id, is_platform_admin)
  VALUES (NEW.id, lower(COALESCE(NEW.email,'')) IN ('svaleriasouza@gmail.com','svaleriacosta@hotmail.com'))
  ON CONFLICT (user_id) DO NOTHING;

  BEGIN
    v_invited := NULLIF(NEW.raw_user_meta_data->>'invited_workspace_id','')::uuid;
  EXCEPTION WHEN others THEN v_invited := NULL;
  END;

  IF v_invited IS NOT NULL AND EXISTS (SELECT 1 FROM public.workspaces WHERE id = v_invited) THEN
    BEGIN
      v_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'invited_role',''), 'operador')::app_role;
    EXCEPTION WHEN others THEN v_role := 'operador';
    END;
    INSERT INTO public.user_roles (user_id, role, workspace_id)
    VALUES (NEW.id, v_role, v_invited)
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;

  INSERT INTO public.workspaces (name, owner_user_id)
  VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name',''), v_name || ' — Workspace'), NEW.id)
  RETURNING id INTO v_ws;

  INSERT INTO public.user_roles (user_id, role, workspace_id)
  VALUES (NEW.id, 'admin', v_ws);

  INSERT INTO public.workspace_settings (workspace_id, name, tagline, owner_name)
  VALUES (v_ws, COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name',''), v_name), 'Assistente Executiva', v_name);

  INSERT INTO public.cadence_settings (workspace_id) VALUES (v_ws);

  INSERT INTO public.cadence_steps (workspace_id, day, script, ai_instructions, active) VALUES
    (v_ws, 1, 'Olá {{nome}}, tudo bem? Sou a EVA, assistente comercial. Posso te mostrar rapidamente como ajudamos empresas como a sua?', 'Se houver interesse, ofereça uma conversa de 15 minutos e proponha dia e horário.', true),
    (v_ws, 2, 'Oi {{nome}}, passando para saber se faz sentido conversarmos esta semana?', 'Qualifique: contexto, dor e prioridade. Uma pergunta por mensagem.', true),
    (v_ws, 3, 'Olá {{nome}}, consegui separar dois horários esta semana. Prefere manhã ou tarde?', 'Conduza para o agendamento com opções concretas.', true),
    (v_ws, 4, 'Oi {{nome}}, ainda faz sentido falarmos sobre isso?', 'Trate objeções com empatia e faça uma pergunta de reengajamento.', true),
    (v_ws, 5, '{{nome}}, vou encerrar meu contato por aqui. Se quiser retomar, basta me chamar!', 'Última mensagem do ciclo. Não se despeça definitivamente, deixe a porta aberta.', true);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;