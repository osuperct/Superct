CREATE TABLE public.avaliacoes_super (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  professor_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('taf','corrida')),
  ano integer NOT NULL DEFAULT extract(year from now())::int,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX avaliacoes_super_taf_ano ON public.avaliacoes_super (aluno_id, ano) WHERE tipo = 'taf';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes_super TO authenticated;
GRANT ALL ON public.avaliacoes_super TO service_role;
ALTER TABLE public.avaliacoes_super ENABLE ROW LEVEL SECURITY;
CREATE POLICY avaliacoes_super_responsavel_read ON public.avaliacoes_super FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY avaliacoes_super_professor_all ON public.avaliacoes_super FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'professor'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'professor'::app_role));
CREATE TRIGGER avaliacoes_super_updated BEFORE UPDATE ON public.avaliacoes_super FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();