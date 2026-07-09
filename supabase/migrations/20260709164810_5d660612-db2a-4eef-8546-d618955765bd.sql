CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.norm_company_name(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(public.unaccent(coalesce(txt,'')), '\s+', ' ', 'g'))
$$;

WITH candidatos AS (
  SELECT DISTINCT ON (public.norm_company_name(company_name))
    trim(company_name) AS name,
    public.norm_company_name(company_name) AS norm,
    city, phone, email
  FROM public.contacts
  WHERE company_name IS NOT NULL
    AND trim(company_name) <> ''
    AND lower(trim(company_name)) <> 'sem nome'
),
existentes AS (
  SELECT public.norm_company_name(name) AS norm FROM public.companies
)
INSERT INTO public.companies (name, city, phone, email)
SELECT c.name, c.city, c.phone, c.email
FROM candidatos c
LEFT JOIN existentes e ON e.norm = c.norm
WHERE e.norm IS NULL;

UPDATE public.contacts ct
SET company_id = co.id
FROM public.companies co
WHERE ct.company_id IS NULL
  AND ct.company_name IS NOT NULL
  AND trim(ct.company_name) <> ''
  AND lower(trim(ct.company_name)) <> 'sem nome'
  AND public.norm_company_name(co.name) = public.norm_company_name(ct.company_name);

UPDATE public.contacts
SET funnel_stage = 'novo_lead'
WHERE funnel_stage IS NULL OR funnel_stage = '';

CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts (company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_funnel_stage ON public.contacts (funnel_stage);