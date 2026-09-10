ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS ai_instructions text NOT NULL DEFAULT '';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS conversation_origin text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS origin_campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS contacts_conversation_origin_idx ON public.contacts (workspace_id, conversation_origin);