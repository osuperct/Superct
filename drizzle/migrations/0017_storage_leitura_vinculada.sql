DROP POLICY IF EXISTS avisos_img_leitura ON storage.objects;
CREATE POLICY avisos_img_leitura ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'avisos' AND (
    private.has_role(auth.uid(), 'professor'::app_role)
    OR private.has_role(auth.uid(), 'adm'::app_role)
    OR EXISTS (SELECT 1 FROM public.avisos a WHERE a.imagem_url = objects.name AND (
      a.alunos_destino IS NULL
      OR EXISTS (SELECT 1 FROM public.alunos al WHERE al.user_id = auth.uid() AND al.id = ANY(a.alunos_destino))))
  ));
DROP POLICY IF EXISTS parceiros_private_upload_read ON storage.objects;
CREATE POLICY parceiros_private_upload_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'app-midias'
  AND EXISTS (SELECT 1 FROM public.parceiros_ct_beneficios b WHERE b.imagem_url = objects.name)
  AND (
    private.has_role(auth.uid(), 'adm'::app_role)
    OR EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = auth.uid() AND p.aprovado AND p.bloqueado_em IS NULL)
  ));
DROP POLICY IF EXISTS parceiros_banner_responsavel_read ON storage.objects;
CREATE POLICY parceiros_banner_responsavel_read ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'app-midias'
  AND EXISTS (SELECT 1 FROM public.parceiros_ct_config c WHERE c.banner_responsavel = objects.name)
  AND (
    private.has_role(auth.uid(), 'adm'::app_role)
    OR EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = auth.uid() AND p.aprovado AND p.bloqueado_em IS NULL)
  ));