CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cpf text;
  v_extra jsonb;
BEGIN
  v_cpf := nullif(regexp_replace(coalesce(NEW.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), '');

  INSERT INTO public.perfis (id, nome_responsavel, telefone, cpf, endereco, aceite_imagem, aceite_imagem_em)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'nome_responsavel', ''),
    NEW.raw_user_meta_data->>'telefone',
    v_cpf,
    nullif(NEW.raw_user_meta_data->>'endereco', ''),
    coalesce((NEW.raw_user_meta_data->>'aceite_imagem')::boolean, false),
    CASE WHEN coalesce((NEW.raw_user_meta_data->>'aceite_imagem')::boolean, false) THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  IF coalesce(NEW.raw_user_meta_data->>'aluno_nome', '') <> '' THEN
    INSERT INTO public.alunos (user_id, nome, idade)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'aluno_nome',
      nullif(regexp_replace(coalesce(NEW.raw_user_meta_data->>'aluno_idade', ''), '\D', '', 'g'), '')::int
    );
  END IF;

  IF jsonb_typeof(NEW.raw_user_meta_data->'alunos_extras') = 'array' THEN
    FOR v_extra IN SELECT * FROM jsonb_array_elements(NEW.raw_user_meta_data->'alunos_extras') LOOP
      IF coalesce(btrim(v_extra->>'nome'), '') <> '' THEN
        INSERT INTO public.alunos (user_id, nome, idade)
        VALUES (
          NEW.id,
          left(btrim(v_extra->>'nome'), 120),
          nullif(regexp_replace(coalesce(v_extra->>'idade', ''), '\D', '', 'g'), '')::int
        );
      END IF;
    END LOOP;
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