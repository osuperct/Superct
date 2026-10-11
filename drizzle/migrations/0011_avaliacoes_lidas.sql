CREATE TABLE public.avaliacoes_lidas (
  user_id uuid NOT NULL,
  avaliacao_id uuid NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  lida_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, avaliacao_id)
);
GRANT SELECT, INSERT ON public.avaliacoes_lidas TO authenticated;
GRANT ALL ON public.avaliacoes_lidas TO service_role;
ALTER TABLE public.avaliacoes_lidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY avaliacoes_lidas_own_read ON public.avaliacoes_lidas
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY avaliacoes_lidas_own_insert ON public.avaliacoes_lidas
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.avaliacoes a WHERE a.id = avaliacao_id AND a.user_id = auth.uid())
  );