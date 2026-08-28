CREATE POLICY "wa_audio_read_own_workspace"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'whatsapp-audio'
  AND (storage.foldername(name))[1] = public.current_workspace_id()::text
);