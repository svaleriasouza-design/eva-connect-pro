
CREATE TABLE IF NOT EXISTS public.meta_wa_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  phone_number_id text,
  access_token text,
  app_secret text,
  verify_token text,
  graph_version text DEFAULT 'v21.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_wa_settings TO authenticated;
GRANT ALL ON public.meta_wa_settings TO service_role;

ALTER TABLE public.meta_wa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read meta settings"
  ON public.meta_wa_settings FOR SELECT
  TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert meta settings"
  ON public.meta_wa_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update meta settings"
  ON public.meta_wa_settings FOR UPDATE
  TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_meta_wa_settings_updated_at
  BEFORE UPDATE ON public.meta_wa_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.meta_wa_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
