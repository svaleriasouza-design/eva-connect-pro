
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['activities','companies','contacts','events','tasks','message_templates']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "auth_select" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "auth_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY "auth_update" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)', t);
    EXECUTE format('CREATE POLICY "auth_delete" ON public.%I FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL)', t);
  END LOOP;
END $$;
