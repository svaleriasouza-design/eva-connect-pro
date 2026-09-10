ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS draft_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.campaigns ALTER COLUMN ai_instructions TYPE text;
ALTER TABLE public.campaigns ALTER COLUMN body TYPE text;
CREATE INDEX IF NOT EXISTS campaigns_workspace_status_idx ON public.campaigns (workspace_id, status);