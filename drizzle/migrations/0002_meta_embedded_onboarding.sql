ALTER TABLE public.whatsapp_numbers ADD COLUMN IF NOT EXISTS connection_source text NOT NULL DEFAULT 'manual', ADD COLUMN IF NOT EXISTS meta_app_id text, ADD COLUMN IF NOT EXISTS encrypted_access_token text, ADD COLUMN IF NOT EXISTS token_expires_at timestamptz, ADD COLUMN IF NOT EXISTS onboarding_status text, ADD COLUMN IF NOT EXISTS verified_business_name text;
CREATE TABLE public.meta_embedded_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES public.workspaces(id), user_id uuid NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled')), expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, number_id uuid REFERENCES public.whatsapp_numbers(id), error_message text);
GRANT ALL ON public.meta_embedded_attempts TO service_role;
REVOKE ALL ON public.meta_embedded_attempts FROM anon, authenticated;
ALTER TABLE public.meta_embedded_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX meta_embedded_attempts_scope ON public.meta_embedded_attempts(workspace_id,user_id,created_at);
CREATE OR REPLACE FUNCTION public.eva_guard_embedded_phone_owner() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN
IF NEW.connection_source = 'embedded' THEN
PERFORM pg_advisory_xact_lock(hashtextextended(NEW.phone_number_id, 0));
IF EXISTS (SELECT 1 FROM public.whatsapp_numbers WHERE phone_number_id = NEW.phone_number_id AND id <> NEW.id AND workspace_id <> NEW.workspace_id) THEN RAISE EXCEPTION 'Número já associado a outra empresa'; END IF;
END IF; RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.eva_guard_embedded_phone_owner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eva_guard_embedded_phone_owner() TO service_role;
CREATE TRIGGER eva_embedded_phone_owner BEFORE INSERT OR UPDATE OF phone_number_id, workspace_id, connection_source ON public.whatsapp_numbers FOR EACH ROW EXECUTE FUNCTION public.eva_guard_embedded_phone_owner();