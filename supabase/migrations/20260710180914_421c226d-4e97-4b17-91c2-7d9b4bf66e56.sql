CREATE OR REPLACE FUNCTION public.norm_company_name(txt text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path = public
AS $function$
  SELECT lower(regexp_replace(public.unaccent(coalesce(txt,'')), '\s+', ' ', 'g'))
$function$;