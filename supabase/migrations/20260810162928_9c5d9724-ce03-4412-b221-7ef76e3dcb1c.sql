UPDATE public.activities
SET status = 'UNSUPPORTED',
    title = 'Mensagem não suportada (ignorada)'
WHERE kind = 'whatsapp_in'
  AND coalesce(status,'') <> 'UNSUPPORTED'
  AND content ~ '^\[(unsupported|sticker|reaction|system|unknown|ephemeral|order|request_welcome|image|video|document|contacts|location)\]$';