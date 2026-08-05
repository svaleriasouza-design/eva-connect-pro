ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.import_batches ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_contacts_batch ON public.contacts (import_batch_id);
CREATE INDEX IF NOT EXISTS idx_contacts_deleted ON public.contacts (deleted_at);
CREATE INDEX IF NOT EXISTS idx_companies_batch ON public.companies (import_batch_id);

DROP POLICY IF EXISTS ws_all ON public.contacts;
CREATE POLICY ws_all ON public.contacts FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id() AND deleted_at IS NULL)
  WITH CHECK (workspace_id = public.current_workspace_id());

DROP POLICY IF EXISTS ws_all ON public.companies;
CREATE POLICY ws_all ON public.companies FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id() AND deleted_at IS NULL)
  WITH CHECK (workspace_id = public.current_workspace_id());

UPDATE public.contacts SET origin = 'WhatsApp (entrada)'
WHERE origin IS NULL AND name LIKE 'WhatsApp 55%';