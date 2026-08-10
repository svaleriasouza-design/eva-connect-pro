CREATE TABLE public.saturday_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  contact_name text,
  phone text,
  start_at timestamptz not null,
  duration_minutes integer not null default 30,
  online boolean not null default true,
  status text not null default 'pending',
  decided_at timestamptz,
  decided_by uuid,
  decided_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saturday_requests TO authenticated;
GRANT ALL ON public.saturday_requests TO service_role;

ALTER TABLE public.saturday_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY ws_all ON public.saturday_requests FOR ALL TO authenticated
  USING (workspace_id = public.current_workspace_id())
  WITH CHECK (workspace_id = public.current_workspace_id());

CREATE TRIGGER trg_saturday_requests_updated BEFORE UPDATE ON public.saturday_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_saturday_requests_pending ON public.saturday_requests (workspace_id, status, start_at);