ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS attendee_email text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS events_google_event_id_idx ON public.events (google_event_id);
CREATE INDEX IF NOT EXISTS events_starts_at_idx ON public.events (starts_at);