ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS imagem_url text;

CREATE POLICY "avisos_img_professor_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avisos' AND private.has_role(auth.uid(), 'professor'::app_role));

CREATE POLICY "avisos_img_professor_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avisos' AND private.has_role(auth.uid(), 'professor'::app_role));

CREATE POLICY "avisos_img_leitura" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avisos');