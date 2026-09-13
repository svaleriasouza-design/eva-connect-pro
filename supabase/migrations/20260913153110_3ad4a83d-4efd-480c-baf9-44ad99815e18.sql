CREATE TABLE public.google_calendar_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_key_ciphertext text NOT NULL,
  google_email text,
  calendar_id text NOT NULL DEFAULT 'primary',
  reconnect_required boolean NOT NULL DEFAULT false,
  connected_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX google_calendar_connections_workspace_idx ON public.google_calendar_connections (workspace_id);

GRANT ALL ON public.google_calendar_connections TO service_role;

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_google_calendar_connections_updated_at
BEFORE UPDATE ON public.google_calendar_connections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();