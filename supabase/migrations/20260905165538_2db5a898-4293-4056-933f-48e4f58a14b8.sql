ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS liberado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS liberado_em timestamptz;

UPDATE public.documentos SET liberado = true, liberado_em = coalesce(liberado_em, now()) WHERE liberado = false;

DROP POLICY IF EXISTS documentos_delete_own ON public.documentos;
CREATE POLICY documentos_delete_own ON public.documentos
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND enviado_por_professor = false AND liberado = false);

DROP POLICY IF EXISTS documentos_update_own ON public.documentos;
CREATE POLICY documentos_update_own ON public.documentos
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND enviado_por_professor = false AND liberado = false)
  WITH CHECK (user_id = auth.uid() AND enviado_por_professor = false AND liberado = false);

DROP POLICY IF EXISTS documentos_insert_own ON public.documentos;
CREATE POLICY documentos_insert_own ON public.documentos
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND enviado_por_professor = false AND liberado = false);