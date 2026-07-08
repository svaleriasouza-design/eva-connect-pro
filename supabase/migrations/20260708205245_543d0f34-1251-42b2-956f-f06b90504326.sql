
-- Drop all existing permissive policies and recreate scoped to authenticated users only
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('activities','companies','contacts','events','tasks','message_templates')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Revoke anon access, ensure authenticated has DML
REVOKE ALL ON public.activities, public.companies, public.contacts, public.events, public.tasks, public.message_templates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities, public.companies, public.contacts, public.events, public.tasks, public.message_templates TO authenticated;
GRANT ALL ON public.activities, public.companies, public.contacts, public.events, public.tasks, public.message_templates TO service_role;

-- Authenticated-only policies (single-workspace internal tool)
CREATE POLICY "authenticated_all" ON public.activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.companies  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.contacts   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.events     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.tasks      FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Message templates: authenticated read/write, no anon
CREATE POLICY "authenticated_all" ON public.message_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
