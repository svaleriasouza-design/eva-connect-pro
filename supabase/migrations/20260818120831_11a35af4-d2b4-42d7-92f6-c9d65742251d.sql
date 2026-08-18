-- 1) Números WhatsApp por workspace (1 workspace -> N números)
CREATE TABLE public.whatsapp_numbers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  label text NOT NULL,
  display_phone text,
  phone_number_id text NOT NULL,
  waba_id text,
  access_token text,
  app_secret text,
  verify_token text,
  graph_version text NOT NULL DEFAULT 'v21.0',
  default_template_name text NOT NULL DEFAULT 'hello_world',
  default_template_lang text NOT NULL DEFAULT 'en_US',
  active boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT false,
  connection_status text NOT NULL DEFAULT 'unknown',
  connection_error text,
  last_checked_at timestamptz,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX whatsapp_numbers_phone_number_id_key ON public.whatsapp_numbers(phone_number_id);
CREATE UNIQUE INDEX whatsapp_numbers_one_primary ON public.whatsapp_numbers(workspace_id) WHERE is_primary;
CREATE INDEX whatsapp_numbers_ws_idx ON public.whatsapp_numbers(workspace_id);

GRANT ALL ON public.whatsapp_numbers TO service_role;
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
-- Sem política para anon/authenticated: credenciais só são lidas pelo backend.

CREATE TRIGGER trg_whatsapp_numbers_updated BEFORE UPDATE ON public.whatsapp_numbers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Migra a configuração atual (preservando o número que já funciona)
INSERT INTO public.whatsapp_numbers (
  workspace_id, label, phone_number_id, access_token, app_secret, verify_token,
  graph_version, default_template_name, default_template_lang, is_primary, active,
  connection_status, connected_at
)
SELECT s.workspace_id,
       COALESCE(NULLIF(ws.name,''), 'Número principal'),
       s.phone_number_id,
       s.access_token, s.app_secret, s.verify_token,
       COALESCE(s.graph_version,'v21.0'),
       COALESCE(s.default_template_name,'hello_world'),
       COALESCE(s.default_template_lang,'en_US'),
       true, true, 'unknown', s.created_at
FROM public.meta_wa_settings s
LEFT JOIN public.workspaces ws ON ws.id = s.workspace_id
WHERE COALESCE(s.phone_number_id,'') <> ''
ON CONFLICT (phone_number_id) DO NOTHING;

-- 3) Vínculo de conversas/mensagens com o número da EVA
ALTER TABLE public.contacts ADD COLUMN whatsapp_number_id uuid REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL;
ALTER TABLE public.activities ADD COLUMN whatsapp_number_id uuid REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL;
CREATE INDEX activities_wa_number_idx ON public.activities(whatsapp_number_id);

-- 4) Campanhas / disparos multi-número
CREATE TABLE public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  body text NOT NULL,
  strategy text NOT NULL DEFAULT 'balanced',
  status text NOT NULL DEFAULT 'draft',
  number_ids uuid[] NOT NULL DEFAULT '{}',
  total_targets integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  batch_size integer NOT NULL DEFAULT 50,
  created_by uuid,
  created_by_name text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaigns_ws_idx ON public.campaigns(workspace_id, created_at DESC);
GRANT SELECT ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_read_own_workspace" ON public.campaigns FOR SELECT TO authenticated
USING (workspace_id = public.current_workspace_id());
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.campaign_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  whatsapp_number_id uuid REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL,
  phone_number_id text,
  to_phone text,
  status text NOT NULL DEFAULT 'pending',
  external_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX campaign_targets_unique_contact ON public.campaign_targets(campaign_id, contact_id);
CREATE INDEX campaign_targets_pending_idx ON public.campaign_targets(campaign_id, status);
GRANT SELECT ON public.campaign_targets TO authenticated;
GRANT ALL ON public.campaign_targets TO service_role;
ALTER TABLE public.campaign_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_targets_read_own_workspace" ON public.campaign_targets FOR SELECT TO authenticated
USING (workspace_id = public.current_workspace_id());