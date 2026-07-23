ALTER TABLE public.cadence_settings
  ADD COLUMN IF NOT EXISTS last_morning_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_afternoon_run_at timestamptz;