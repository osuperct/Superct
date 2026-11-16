DROP POLICY IF EXISTS parceiros_upload_read ON storage.objects;
CREATE POLICY parceiros_upload_read ON storage.objects FOR SELECT TO anon, authenticated USING (
  bucket_id = 'app-midias' AND (
    EXISTS (SELECT 1 FROM public.parceiros_ct WHERE parceiros_ct.ativo AND parceiros_ct.logo_url = objects.name)
    OR EXISTS (SELECT 1 FROM public.parceiros_ct_config WHERE parceiros_ct_config.banner_publico = objects.name)
  ));
CREATE POLICY parceiros_banner_responsavel_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'app-midias' AND auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.parceiros_ct_config WHERE parceiros_ct_config.banner_responsavel = objects.name));