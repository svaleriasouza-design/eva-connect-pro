ALTER TABLE public.cadence_settings
  ADD COLUMN IF NOT EXISTS eva_behavior text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS handoff_rules text NOT NULL DEFAULT '';