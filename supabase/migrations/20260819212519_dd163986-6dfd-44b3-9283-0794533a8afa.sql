-- Camada de acesso da plataforma (admin único, VIP, degustação)
CREATE TABLE IF NOT EXISTS public.platform_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_platform_admin boolean NOT NULL DEFAULT false,
  vip boolean NOT NULL DEFAULT false,
  trial_ends_at timestamptz,
  access_revoked boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_access TO authenticated;
GRANT ALL ON public.platform_access TO service_role;

ALTER TABLE public.platform_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_access
    WHERE user_id = _user_id AND is_platform_admin = true
  )
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "own access row" ON public.platform_access;
CREATE POLICY "own access row" ON public.platform_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.has_app_access(_user_id uuid, check_env text DEFAULT 'live'::text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.platform_access;
BEGIN
  SELECT * INTO r FROM public.platform_access WHERE user_id = _user_id;
  IF r.is_platform_admin THEN RETURN true; END IF;
  IF r.access_revoked THEN RETURN false; END IF;
  IF r.vip THEN RETURN true; END IF;
  IF r.trial_ends_at IS NOT NULL AND r.trial_ends_at > now() THEN RETURN true; END IF;
  RETURN public.has_active_subscription(_user_id, check_env);
END;
$$;

REVOKE ALL ON FUNCTION public.has_app_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_app_access(uuid, text) TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_platform_access_updated ON public.platform_access;
CREATE TRIGGER trg_platform_access_updated BEFORE UPDATE ON public.platform_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Todo novo usuário nasce como usuário comum; admin único por e-mail.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_ws uuid;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, v_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.platform_access (user_id, is_platform_admin)
  VALUES (NEW.id, lower(COALESCE(NEW.email,'')) = 'svaleriasouza@gmail.com')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.workspaces (name)
  VALUES (COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name',''), v_name || ' — Workspace'))
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
$function$;

-- Backfill: cria a linha de acesso para quem já existe e marca a administradora.
INSERT INTO public.platform_access (user_id, is_platform_admin)
SELECT u.id, lower(COALESCE(u.email,'')) = 'svaleriasouza@gmail.com'
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.platform_access pa SET is_platform_admin = true
FROM auth.users u
WHERE u.id = pa.user_id AND lower(COALESCE(u.email,'')) = 'svaleriasouza@gmail.com';