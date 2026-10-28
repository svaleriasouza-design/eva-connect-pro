CREATE OR REPLACE FUNCTION public.eva_set_cron_secret(p_secret text, p_apikey text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $fn$
DECLARE h text;
BEGIN
  IF p_secret IS NULL OR length(p_secret) < 16 THEN RAISE EXCEPTION 'invalid secret'; END IF;
  h := jsonb_build_object('Content-Type','application/json','apikey',p_apikey,'x-cron-secret',p_secret)::text;
  PERFORM cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='eva-cadence-tick'), command := format($c$SELECT net.http_post(url := 'https://project--90136cc5-512a-4924-accd-a888fd73d8e5.lovable.app/api/public/hooks/cadence-run', headers := %L::jsonb, body := '{}'::jsonb) AS request_id;$c$, h));
  PERFORM cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='eva-campaign-tick'), command := format($c$SELECT net.http_post(url := 'https://project--90136cc5-512a-4924-accd-a888fd73d8e5.lovable.app/api/public/hooks/campaign-run', headers := %L::jsonb, body := '{}'::jsonb) AS request_id;$c$, h));
  RETURN true;
END $fn$;
REVOKE ALL ON FUNCTION public.eva_set_cron_secret(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eva_set_cron_secret(text, text) TO service_role;