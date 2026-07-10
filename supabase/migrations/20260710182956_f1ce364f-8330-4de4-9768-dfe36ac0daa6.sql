
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS funnel_stage text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS contacts_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.funnel_stage_rank(stage text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE stage
    WHEN 'novo_lead' THEN 1
    WHEN 'primeiro_contato' THEN 2
    WHEN 'qualificado' THEN 3
    WHEN 'reuniao_agendada' THEN 4
    WHEN 'proposta_enviada' THEN 5
    WHEN 'fechado' THEN 6
    WHEN 'cliente_ativo' THEN 7
    WHEN 'pos_venda' THEN 8
    ELSE 0
  END
$$;

CREATE OR REPLACE FUNCTION public.recompute_company_aggregates(_company_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_responsible text; v_whatsapp text; v_email text; v_city text;
  v_stage text; v_status text; v_last timestamptz;
  v_next_action text; v_next_at timestamptz; v_count integer;
BEGIN
  IF _company_id IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO v_count FROM public.contacts WHERE company_id = _company_id;
  SELECT name, whatsapp, email, city INTO v_responsible, v_whatsapp, v_email, v_city
    FROM public.contacts WHERE company_id = _company_id ORDER BY created_at ASC LIMIT 1;
  SELECT funnel_stage INTO v_stage FROM public.contacts
    WHERE company_id = _company_id AND funnel_stage IS NOT NULL
    ORDER BY public.funnel_stage_rank(funnel_stage) DESC, updated_at DESC LIMIT 1;
  SELECT status INTO v_status FROM public.contacts
    WHERE company_id = _company_id AND status IS NOT NULL
    ORDER BY updated_at DESC LIMIT 1;
  SELECT max(last_contact_at) INTO v_last FROM public.contacts WHERE company_id = _company_id;
  SELECT next_action, next_action_at INTO v_next_action, v_next_at FROM public.contacts
    WHERE company_id = _company_id AND next_action IS NOT NULL
    ORDER BY next_action_at ASC NULLS LAST, updated_at DESC LIMIT 1;

  UPDATE public.companies SET
    contacts_count = v_count,
    responsible = COALESCE(NULLIF(responsible, ''), v_responsible),
    whatsapp = COALESCE(NULLIF(whatsapp, ''), v_whatsapp),
    phone = COALESCE(NULLIF(phone, ''), v_whatsapp),
    email = COALESCE(NULLIF(email, ''), v_email),
    city = COALESCE(NULLIF(city, ''), v_city),
    funnel_stage = COALESCE(v_stage, funnel_stage),
    status = COALESCE(v_status, status),
    last_contact_at = v_last,
    next_action = v_next_action,
    next_action_at = v_next_at,
    updated_at = now()
  WHERE id = _company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.contacts_sync_company()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_company_aggregates(OLD.company_id);
    RETURN OLD;
  END IF;
  IF (TG_OP = 'UPDATE') AND OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    PERFORM public.recompute_company_aggregates(OLD.company_id);
  END IF;
  PERFORM public.recompute_company_aggregates(NEW.company_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contacts_sync_company ON public.contacts;
CREATE TRIGGER trg_contacts_sync_company
AFTER INSERT OR UPDATE OF company_id, funnel_stage, status, last_contact_at, next_action, next_action_at, name, whatsapp, email, city
OR DELETE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.contacts_sync_company();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.companies LOOP
    PERFORM public.recompute_company_aggregates(r.id);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_companies_last_contact ON public.companies (last_contact_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_companies_stage ON public.companies (funnel_stage);
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON public.companies USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_updated ON public.contacts (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON public.contacts (last_contact_at DESC NULLS LAST);
