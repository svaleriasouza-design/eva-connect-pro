ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS presale_stage text,
  ADD COLUMN IF NOT EXISTS sales_stage text;

CREATE INDEX IF NOT EXISTS contacts_presale_stage_idx
  ON public.contacts (workspace_id, presale_stage)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS contacts_sales_stage_idx
  ON public.contacts (workspace_id, sales_stage)
  WHERE deleted_at IS NULL;