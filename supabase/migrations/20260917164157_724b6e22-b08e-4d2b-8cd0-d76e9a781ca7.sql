DROP INDEX IF EXISTS public.whatsapp_numbers_phone_number_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_numbers_ws_phone_uniq ON public.whatsapp_numbers (workspace_id, phone_number_id);