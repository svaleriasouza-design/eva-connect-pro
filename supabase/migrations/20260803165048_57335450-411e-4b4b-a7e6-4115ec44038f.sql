CREATE TABLE IF NOT EXISTS public.workspace_settings (
  id boolean NOT NULL DEFAULT true PRIMARY KEY CHECK (id),
  name text NOT NULL DEFAULT 'EVA IA',
  tagline text,
  owner_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.workspace_settings TO authenticated;
GRANT ALL ON public.workspace_settings TO service_role;

ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace read" ON public.workspace_settings;
CREATE POLICY "workspace read" ON public.workspace_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS trg_workspace_settings_updated ON public.workspace_settings;
CREATE TRIGGER trg_workspace_settings_updated BEFORE UPDATE ON public.workspace_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.workspace_settings (id, name, tagline) VALUES (true, 'EVA IA', 'Assistente Executiva')
ON CONFLICT (id) DO NOTHING;