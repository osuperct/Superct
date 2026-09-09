DROP POLICY IF EXISTS documentos_select_own ON public.documentos;
CREATE POLICY documentos_select_own ON public.documentos
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      enviado_por_professor = false
      OR (oculto_responsavel = false AND liberado = true)
    )
  );