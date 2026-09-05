CREATE TABLE public.avaliacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  professor_id uuid NOT NULL,
  referencia date NOT NULL,
  coordenacao_motora text NOT NULL DEFAULT 'amarelo',
  forca_resistencia text NOT NULL DEFAULT 'amarelo',
  velocidade_agilidade text NOT NULL DEFAULT 'amarelo',
  respeito_empatia text NOT NULL DEFAULT 'amarelo',
  disciplina text NOT NULL DEFAULT 'amarelo',
  comportamento text NOT NULL DEFAULT 'amarelo',
  execucao_exercicios text NOT NULL DEFAULT 'amarelo',
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT avaliacoes_cores_check CHECK (
    coordenacao_motora IN ('vermelho','amarelo','verde') AND
    forca_resistencia IN ('vermelho','amarelo','verde') AND
    velocidade_agilidade IN ('vermelho','amarelo','verde') AND
    respeito_empatia IN ('vermelho','amarelo','verde') AND
    disciplina IN ('vermelho','amarelo','verde') AND
    comportamento IN ('vermelho','amarelo','verde') AND
    execucao_exercicios IN ('vermelho','amarelo','verde')
  ),
  CONSTRAINT avaliacoes_aluno_mes_unico UNIQUE (aluno_id, referencia)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avaliacoes_professor_all" ON public.avaliacoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'professor'))
  WITH CHECK (public.has_role(auth.uid(), 'professor'));

CREATE POLICY "avaliacoes_responsavel_read" ON public.avaliacoes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER avaliacoes_updated_at BEFORE UPDATE ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();