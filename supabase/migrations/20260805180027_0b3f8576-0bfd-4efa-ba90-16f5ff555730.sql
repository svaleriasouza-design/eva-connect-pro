CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  inserted_rows integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY ws_all ON public.import_batches FOR ALL TO authenticated
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

CREATE TRIGGER trg_import_batches_updated_at BEFORE UPDATE ON public.import_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.contacts ADD COLUMN import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL;
ALTER TABLE public.companies ADD COLUMN import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE INDEX idx_contacts_import_batch ON public.contacts(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX idx_companies_import_batch ON public.companies(import_batch_id) WHERE import_batch_id IS NOT NULL;