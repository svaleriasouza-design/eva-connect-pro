ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS campaigns_scheduled_at_idx ON public.campaigns (status, scheduled_at);