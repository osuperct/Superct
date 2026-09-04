-- Funções de acesso
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('professor', 'responsavel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Matrícula dos alunos
CREATE SEQUENCE IF NOT EXISTS public.matricula_seq START 1;
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS matricula text;
ALTER TABLE public.alunos ALTER COLUMN matricula SET DEFAULT 'SCT-' || lpad(nextval('public.matricula_seq')::text, 4, '0');
UPDATE public.alunos SET matricula = 'SCT-' || lpad(nextval('public.matricula_seq')::text, 4, '0') WHERE matricula IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS alunos_matricula_key ON public.alunos (matricula);

-- Acesso do professor a tudo
DROP POLICY IF EXISTS alunos_professor_read ON public.alunos;
CREATE POLICY alunos_professor_read ON public.alunos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'professor'));

DROP POLICY IF EXISTS documentos_professor_read ON public.documentos;
CREATE POLICY documentos_professor_read ON public.documentos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'professor'));

DROP POLICY IF EXISTS fichas_professor_read ON public.fichas;
CREATE POLICY fichas_professor_read ON public.fichas
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'professor'));

DROP POLICY IF EXISTS perfis_professor_read ON public.perfis;
CREATE POLICY perfis_professor_read ON public.perfis
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'professor'));

-- Arquivos assinados: professor pode ler todos os PDFs do bucket
DROP POLICY IF EXISTS documentos_alunos_professor_read ON storage.objects;
CREATE POLICY documentos_alunos_professor_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-alunos' AND public.has_role(auth.uid(), 'professor'));

-- Conta do Super CT recebe a função de professor
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_cpf text;
BEGIN
  v_cpf := nullif(regexp_replace(coalesce(NEW.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), '');

  INSERT INTO public.perfis (id, nome_responsavel, telefone, cpf, aceite_imagem, aceite_imagem_em)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'nome_responsavel', ''),
    NEW.raw_user_meta_data->>'telefone',
    v_cpf,
    coalesce((NEW.raw_user_meta_data->>'aceite_imagem')::boolean, false),
    CASE WHEN coalesce((NEW.raw_user_meta_data->>'aceite_imagem')::boolean, false) THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  IF coalesce(NEW.raw_user_meta_data->>'aluno_nome', '') <> '' THEN
    INSERT INTO public.alunos (user_id, nome, idade)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'aluno_nome',
      nullif(NEW.raw_user_meta_data->>'aluno_idade', '')::int
    );
  END IF;

  IF lower(coalesce(NEW.email, '')) = 'osuper.c.t@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'professor')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;