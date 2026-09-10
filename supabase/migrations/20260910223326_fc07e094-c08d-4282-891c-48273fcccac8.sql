ALTER TABLE public.cadence_steps
  ADD COLUMN IF NOT EXISTS reply_type text NOT NULL DEFAULT 'texto',
  ADD COLUMN IF NOT EXISTS audio_path text,
  ADD COLUMN IF NOT EXISTS audio_name text;

ALTER TABLE public.cadence_steps
  DROP CONSTRAINT IF EXISTS cadence_steps_reply_type_check;

ALTER TABLE public.cadence_steps
  ADD CONSTRAINT cadence_steps_reply_type_check
  CHECK (reply_type IN ('texto', 'audio', 'texto_audio'));