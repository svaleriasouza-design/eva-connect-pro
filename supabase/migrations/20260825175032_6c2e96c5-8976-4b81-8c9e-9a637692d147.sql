ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS human_takeover boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS human_takeover_at timestamptz,
  ADD COLUMN IF NOT EXISTS human_takeover_by uuid,
  ADD COLUMN IF NOT EXISTS human_takeover_by_name text;

CREATE INDEX IF NOT EXISTS contacts_human_takeover_idx ON public.contacts (workspace_id, human_takeover);

UPDATE public.contacts SET human_takeover = true, human_takeover_at = COALESCE(human_takeover_at, now())
WHERE ai_paused = true AND human_takeover = false;