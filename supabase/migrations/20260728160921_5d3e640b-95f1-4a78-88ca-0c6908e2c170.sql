ALTER TABLE public.meta_wa_settings
  ADD COLUMN IF NOT EXISTS default_template_name text DEFAULT 'hello_world',
  ADD COLUMN IF NOT EXISTS default_template_lang text DEFAULT 'en_US';
UPDATE public.meta_wa_settings SET default_template_name = COALESCE(default_template_name,'hello_world'), default_template_lang = COALESCE(default_template_lang,'en_US') WHERE id = true;