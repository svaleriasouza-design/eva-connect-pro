ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_outbound_at timestamptz;

CREATE OR REPLACE FUNCTION public.contacts_recompute_message_status(_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_in timestamptz;
  v_out timestamptz;
BEGIN
  IF _contact_id IS NULL THEN RETURN; END IF;

  SELECT max(created_at) INTO v_in
  FROM public.activities
  WHERE contact_id = _contact_id
    AND kind = 'whatsapp_in'
    AND coalesce(upper(status), 'RECEIVED') <> 'UNSUPPORTED';

  SELECT max(created_at) INTO v_out
  FROM public.activities
  WHERE contact_id = _contact_id
    AND kind = 'whatsapp_out'
    AND coalesce(upper(status), 'SENT') NOT IN ('FAILED', 'BLOCKED');

  UPDATE public.contacts c
  SET last_inbound_at = v_in,
      last_outbound_at = v_out,
      status = CASE
        WHEN c.status = 'perdido' THEN c.status
        WHEN v_in IS NOT NULL AND (v_out IS NULL OR v_in > v_out) THEN 'aguardando_contato'
        WHEN v_out IS NOT NULL THEN 'aguardando_resposta'
        ELSE 'ativo'
      END,
      updated_at = now()
  WHERE c.id = _contact_id;
END;
$$;

REVOKE ALL ON FUNCTION public.contacts_recompute_message_status(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.activities_sync_contact_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.contacts_recompute_message_status(OLD.contact_id);
    RETURN OLD;
  END IF;

  IF NEW.kind IN ('whatsapp_in', 'whatsapp_out') THEN
    PERFORM public.contacts_recompute_message_status(NEW.contact_id);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.contact_id IS DISTINCT FROM NEW.contact_id THEN
    PERFORM public.contacts_recompute_message_status(OLD.contact_id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.activities_sync_contact_status() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS activities_sync_contact_status_trg ON public.activities;
CREATE TRIGGER activities_sync_contact_status_trg
AFTER INSERT OR UPDATE OR DELETE ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.activities_sync_contact_status();

-- Auditoria/recálculo de todos os leads existentes
WITH agg AS (
  SELECT c.id,
         (SELECT max(a.created_at) FROM public.activities a
           WHERE a.contact_id = c.id AND a.kind = 'whatsapp_in'
             AND coalesce(upper(a.status), 'RECEIVED') <> 'UNSUPPORTED') AS v_in,
         (SELECT max(a.created_at) FROM public.activities a
           WHERE a.contact_id = c.id AND a.kind = 'whatsapp_out'
             AND coalesce(upper(a.status), 'SENT') NOT IN ('FAILED', 'BLOCKED')) AS v_out
  FROM public.contacts c
)
UPDATE public.contacts c
SET last_inbound_at = agg.v_in,
    last_outbound_at = agg.v_out,
    status = CASE
      WHEN c.status = 'perdido' THEN c.status
      WHEN agg.v_in IS NOT NULL AND (agg.v_out IS NULL OR agg.v_in > agg.v_out) THEN 'aguardando_contato'
      WHEN agg.v_out IS NOT NULL THEN 'aguardando_resposta'
      ELSE 'ativo'
    END
FROM agg
WHERE agg.id = c.id;