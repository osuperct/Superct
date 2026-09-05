CREATE TABLE public.mensalidades (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  referencia date NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  valor numeric(10,2),
  pago boolean NOT NULL DEFAULT false,
  pago_em date,
  forma text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, referencia)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensalidades TO authenticated;
GRANT ALL ON public.mensalidades TO service_role;

ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mensalidades_professor_all" ON public.mensalidades
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'professor'))
  WITH CHECK (public.has_role(auth.uid(), 'professor'));

CREATE POLICY "mensalidades_responsavel_read" ON public.mensalidades
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER mensalidades_updated_at BEFORE UPDATE ON public.mensalidades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();