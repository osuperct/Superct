CREATE TABLE public.perfis (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome_responsavel TEXT NOT NULL DEFAULT '',
  telefone TEXT,
  cpf TEXT,
  endereco TEXT,
  aceite_imagem BOOLEAN NOT NULL DEFAULT false,
  aceite_imagem_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfis_own" ON public.perfis FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.alunos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL,
  idade INTEGER,
  nascimento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos TO authenticated;
GRANT ALL ON public.alunos TO service_role;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alunos_own" ON public.alunos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  aluno_id UUID REFERENCES public.alunos ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'outro',
  nome_arquivo TEXT NOT NULL,
  caminho TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documentos_own" ON public.documentos FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.fichas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  aluno_id UUID REFERENCES public.alunos ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'ficha',
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fichas TO authenticated;
GRANT ALL ON public.fichas TO service_role;
ALTER TABLE public.fichas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fichas_own" ON public.fichas FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER perfis_updated_at BEFORE UPDATE ON public.perfis
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, nome_responsavel, telefone, aceite_imagem, aceite_imagem_em)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome_responsavel', ''),
    NEW.raw_user_meta_data ->> 'telefone',
    COALESCE((NEW.raw_user_meta_data ->> 'aceite_imagem')::boolean, false),
    CASE WHEN COALESCE((NEW.raw_user_meta_data ->> 'aceite_imagem')::boolean, false) THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  IF COALESCE(NEW.raw_user_meta_data ->> 'aluno_nome', '') <> '' THEN
    INSERT INTO public.alunos (user_id, nome, idade)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'aluno_nome',
      NULLIF(NEW.raw_user_meta_data ->> 'aluno_idade', '')::int
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();