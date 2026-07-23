DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='meta_wa_settings' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.meta_wa_settings', p.policyname);
  END LOOP;
END $$;

REVOKE ALL ON public.meta_wa_settings FROM anon, authenticated;
GRANT ALL ON public.meta_wa_settings TO service_role;
ALTER TABLE public.meta_wa_settings ENABLE ROW LEVEL SECURITY;
