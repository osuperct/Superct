CREATE TABLE public.presencas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  dia date NOT NULL,
  professor_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, dia)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.presencas TO authenticated;
GRANT ALL ON public.presencas TO service_role;

ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presencas_professor_select" ON public.presencas
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'professor'::app_role) AND private.eh_conta_familia(user_id));

CREATE POLICY "presencas_professor_insert" ON public.presencas
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'professor'::app_role) AND private.eh_conta_familia(user_id));

CREATE POLICY "presencas_professor_delete" ON public.presencas
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'professor'::app_role) AND private.eh_conta_familia(user_id));

CREATE POLICY "presencas_responsavel_select" ON public.presencas
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX presencas_dia_idx ON public.presencas (dia);