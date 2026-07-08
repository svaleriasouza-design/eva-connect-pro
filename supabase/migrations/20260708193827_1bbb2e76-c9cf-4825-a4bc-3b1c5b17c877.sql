
-- Funções utilitárias
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- EMPRESAS
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  responsible TEXT,
  phone TEXT,
  email TEXT,
  segment TEXT,
  city TEXT,
  employees INT,
  diagnosis TEXT,
  last_meeting DATE,
  next_meeting DATE,
  proposals TEXT,
  contracts TEXT,
  trainings TEXT,
  results TEXT,
  renewal DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO anon, authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "public write companies" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "public update companies" ON public.companies FOR UPDATE USING (true);
CREATE POLICY "public delete companies" ON public.companies FOR DELETE USING (true);
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONTATOS (CRM)
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name TEXT,
  whatsapp TEXT,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  facebook TEXT,
  website TEXT,
  city TEXT,
  birthdate DATE,
  profession TEXT,
  children TEXT,
  goal TEXT,
  main_pain TEXT,
  origin TEXT,
  service_interest TEXT,
  funnel_stage TEXT NOT NULL DEFAULT 'novo_lead',
  status TEXT NOT NULL DEFAULT 'ativo',
  last_contact_at TIMESTAMPTZ,
  next_action TEXT,
  next_action_at TIMESTAMPTZ,
  notes TEXT,
  do_not_contact BOOLEAN NOT NULL DEFAULT false,
  cadence_active BOOLEAN NOT NULL DEFAULT false,
  cadence_day INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO anon, authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read contacts" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "public write contacts" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "public update contacts" ON public.contacts FOR UPDATE USING (true);
CREATE POLICY "public delete contacts" ON public.contacts FOR DELETE USING (true);
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_contacts_funnel ON public.contacts(funnel_stage);
CREATE INDEX idx_contacts_company ON public.contacts(company_id);

-- ATIVIDADES / HISTÓRICO
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO anon, authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "public write activities" ON public.activities FOR INSERT WITH CHECK (true);
CREATE POLICY "public update activities" ON public.activities FOR UPDATE USING (true);
CREATE POLICY "public delete activities" ON public.activities FOR DELETE USING (true);
CREATE INDEX idx_activities_contact ON public.activities(contact_id, created_at DESC);

-- TAREFAS
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  done BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "public write tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "public update tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "public delete tasks" ON public.tasks FOR DELETE USING (true);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EVENTOS (AGENDA)
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'reuniao',
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  meet_link TEXT,
  status TEXT NOT NULL DEFAULT 'agendado',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO anon, authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "public write events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "public update events" ON public.events FOR UPDATE USING (true);
CREATE POLICY "public delete events" ON public.events FOR DELETE USING (true);
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_events_starts ON public.events(starts_at);

-- BIBLIOTECA DE MENSAGENS
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO anon, authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read templates" ON public.message_templates FOR SELECT USING (true);
CREATE POLICY "public write templates" ON public.message_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "public update templates" ON public.message_templates FOR UPDATE USING (true);
CREATE POLICY "public delete templates" ON public.message_templates FOR DELETE USING (true);
