DELETE FROM public.activities WHERE contact_id IN (SELECT id FROM public.contacts WHERE whatsapp LIKE '551198765000%');
DELETE FROM public.activities WHERE content LIKE '%Olá, aqui é a EVA.%' AND created_at > now() - interval '1 hour';
DELETE FROM public.contacts WHERE whatsapp LIKE '551198765000%';