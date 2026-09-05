-- Concede o papel ADM ao dono atual (conta professor principal)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'adm'::public.app_role FROM auth.users u
WHERE lower(u.email) = 'osuper.c.t@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ADM pode ver e gerenciar papeis
CREATE POLICY user_roles_adm_select ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'adm'));

CREATE POLICY user_roles_adm_insert ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'adm'));

CREATE POLICY user_roles_adm_delete ON public.user_roles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'adm'));

-- Novo cadastro do dono recebe professor + adm
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'adm')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;