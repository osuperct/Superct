ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS enviado_por_professor boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS documentos_own ON public.documentos;

CREATE POLICY documentos_select_own ON public.documentos
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY documentos_insert_own ON public.documentos
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND enviado_por_professor = false);

CREATE POLICY documentos_update_own ON public.documentos
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND enviado_por_professor = false)
  WITH CHECK (user_id = auth.uid() AND enviado_por_professor = false);

CREATE POLICY documentos_delete_own ON public.documentos
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND enviado_por_professor = false);

CREATE POLICY documentos_professor_insert ON public.documentos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'professor'));

CREATE POLICY documentos_professor_update ON public.documentos
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'professor'))
  WITH CHECK (public.has_role(auth.uid(), 'professor'));

CREATE POLICY documentos_professor_delete ON public.documentos
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'professor'));

CREATE POLICY docs_alunos_professor_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-alunos' AND public.has_role(auth.uid(), 'professor'));

CREATE POLICY docs_alunos_professor_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documentos-alunos' AND public.has_role(auth.uid(), 'professor'));