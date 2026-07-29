CREATE TABLE IF NOT EXISTS public.eva_scheduling_state (
  contact_id uuid PRIMARY KEY REFERENCES public.contacts(id) ON DELETE CASCADE,
  pending_start timestamptz,
  duration_minutes integer NOT NULL DEFAULT 30,
  online boolean NOT NULL DEFAULT true,
  awaiting_email boolean NOT NULL DEFAULT false,
  suggested jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.eva_scheduling_state TO authenticated;
GRANT ALL ON public.eva_scheduling_state TO service_role;
ALTER TABLE public.eva_scheduling_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read scheduling state" ON public.eva_scheduling_state FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);