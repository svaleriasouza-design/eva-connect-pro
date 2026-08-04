-- ============ 1. WORKSPACES ============
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Meu Workspace',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- ============ 2. COLUNAS workspace_id ============
ALTER TABLE public.user_roles ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.contacts ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.companies ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.activities ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.message_templates ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.cadence_steps ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.cadence_settings ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.eva_scheduling_state ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.meta_wa_settings ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.workspace_settings ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- ============ 3. MIGRAÇÃO DOS DADOS ATUAIS ============
DO $mig$
DECLARE wid uuid;
BEGIN
  INSERT INTO public.workspaces (name)
  VALUES (COALESCE((SELECT name FROM public.workspace_settings LIMIT 1), 'Workspace Principal'))
  RETURNING id INTO wid;

  UPDATE public.user_roles SET workspace_id = wid;
  UPDATE public.contacts SET workspace_id = wid;
  UPDATE public.companies SET workspace_id = wid;
  UPDATE public.activities SET workspace_id = wid;
  UPDATE public.tasks SET workspace_id = wid;
  UPDATE public.events SET workspace_id = wid;
  UPDATE public.message_templates SET workspace_id = wid;
  UPDATE public.cadence_steps SET workspace_id = wid;
  UPDATE public.cadence_settings SET workspace_id = wid;
  UPDATE public.eva_scheduling_state SET workspace_id = wid;
  UPDATE public.meta_wa_settings SET workspace_id = wid;
  UPDATE public.workspace_settings SET workspace_id = wid;
END
$mig$;

-- ============ 4. FUNÇÃO DE CONTEXTO ============
CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT workspace_id FROM public.user_roles
  WHERE user_id = auth.uid() AND workspace_id IS NOT NULL
  ORDER BY created_at ASC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND workspace_id = public.current_workspace_id()
  )
$$;

-- ============ 5. NOT NULL + DEFAULT ============
ALTER TABLE public.user_roles ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();
ALTER TABLE public.contacts ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();
ALTER TABLE public.companies ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();
ALTER TABLE public.activities ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();
ALTER TABLE public.tasks ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();
ALTER TABLE public.events ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();
ALTER TABLE public.message_templates ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();
ALTER TABLE public.cadence_steps ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();
ALTER TABLE public.cadence_settings ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();
ALTER TABLE public.eva_scheduling_state ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();
ALTER TABLE public.meta_wa_settings ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();
ALTER TABLE public.workspace_settings ALTER COLUMN workspace_id SET NOT NULL, ALTER COLUMN workspace_id SET DEFAULT public.current_workspace_id();

-- ============ 6. CHAVES PRIMÁRIAS DOS SINGLETONS ============
ALTER TABLE public.cadence_settings DROP CONSTRAINT cadence_settings_pkey;
ALTER TABLE public.cadence_settings ADD PRIMARY KEY (workspace_id);
ALTER TABLE public.meta_wa_settings DROP CONSTRAINT meta_wa_settings_pkey;
ALTER TABLE public.meta_wa_settings ADD PRIMARY KEY (workspace_id);
ALTER TABLE public.workspace_settings DROP CONSTRAINT workspace_settings_pkey;
ALTER TABLE public.workspace_settings ADD PRIMARY KEY (workspace_id);
ALTER TABLE public.cadence_steps DROP CONSTRAINT cadence_steps_pkey;
ALTER TABLE public.cadence_steps ADD PRIMARY KEY (workspace_id, day);

CREATE INDEX IF NOT EXISTS idx_contacts_ws ON public.contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_companies_ws ON public.companies(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activities_ws ON public.activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_events_ws ON public.events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_ws ON public.tasks(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_wa_phone ON public.meta_wa_settings(phone_number_id) WHERE phone_number_id IS NOT NULL;

-- ============ 7. RLS ============
DROP POLICY IF EXISTS auth_select ON public.contacts;
DROP POLICY IF EXISTS auth_insert ON public.contacts;
DROP POLICY IF EXISTS auth_update ON public.contacts;
DROP POLICY IF EXISTS auth_delete ON public.contacts;
DROP POLICY IF EXISTS auth_select ON public.companies;
DROP POLICY IF EXISTS auth_insert ON public.companies;
DROP POLICY IF EXISTS auth_update ON public.companies;
DROP POLICY IF EXISTS auth_delete ON public.companies;
DROP POLICY IF EXISTS auth_select ON public.activities;
DROP POLICY IF EXISTS auth_insert ON public.activities;
DROP POLICY IF EXISTS auth_update ON public.activities;
DROP POLICY IF EXISTS auth_delete ON public.activities;
DROP POLICY IF EXISTS auth_select ON public.tasks;
DROP POLICY IF EXISTS auth_insert ON public.tasks;
DROP POLICY IF EXISTS auth_update ON public.tasks;
DROP POLICY IF EXISTS auth_delete ON public.tasks;
DROP POLICY IF EXISTS auth_select ON public.events;
DROP POLICY IF EXISTS auth_insert ON public.events;
DROP POLICY IF EXISTS auth_update ON public.events;
DROP POLICY IF EXISTS auth_delete ON public.events;
DROP POLICY IF EXISTS auth_select ON public.message_templates;
DROP POLICY IF EXISTS auth_insert ON public.message_templates;
DROP POLICY IF EXISTS auth_update ON public.message_templates;
DROP POLICY IF EXISTS auth_delete ON public.message_templates;
DROP POLICY IF EXISTS "auth read cadence_steps" ON public.cadence_steps;
DROP POLICY IF EXISTS "auth write cadence_steps" ON public.cadence_steps;
DROP POLICY IF EXISTS "auth read cadence_settings" ON public.cadence_settings;
DROP POLICY IF EXISTS "auth write cadence_settings" ON public.cadence_settings;
DROP POLICY IF EXISTS "auth read scheduling state" ON public.eva_scheduling_state;
DROP POLICY IF EXISTS "workspace read" ON public.workspace_settings;
DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;

CREATE POLICY ws_read ON public.workspaces FOR SELECT TO authenticated USING (id = public.current_workspace_id());

CREATE POLICY ws_all ON public.contacts FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id()) WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY ws_all ON public.companies FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id()) WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY ws_all ON public.activities FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id()) WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY ws_all ON public.tasks FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id()) WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY ws_all ON public.events FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id()) WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY ws_all ON public.message_templates FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id()) WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY ws_all ON public.cadence_steps FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id()) WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY ws_all ON public.cadence_settings FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id()) WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY ws_read ON public.eva_scheduling_state FOR SELECT TO authenticated
  USING (workspace_id = public.current_workspace_id());
CREATE POLICY ws_read ON public.workspace_settings FOR SELECT TO authenticated
  USING (workspace_id = public.current_workspace_id());
CREATE POLICY ws_update ON public.workspace_settings FOR UPDATE TO authenticated
  USING (workspace_id = public.current_workspace_id() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (workspace_id = public.current_workspace_id());
CREATE POLICY ws_roles_read ON public.user_roles FOR SELECT TO authenticated
  USING (workspace_id = public.current_workspace_id());

-- profiles: só do próprio workspace
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_workspace ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = public.profiles.id AND ur.workspace_id = public.current_workspace_id()
    )
  );

-- ============ 8. PROVISIONAMENTO AUTOMÁTICO NO SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_name text;
  v_ws uuid;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, v_name)
  ON CONFLICT (id) DO NOTHING;

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
$fn$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_settings TO authenticated;