create or replace function public.prof_criar_aluno(
  _user_id uuid,
  _nome text,
  _nascimento date default null,
  _idade int default null,
  _fisico boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not private.has_role(auth.uid(), 'professor'::app_role) then
    return jsonb_build_object('ok', false, 'erro', 'Acesso restrito ao professor.');
  end if;
  if coalesce(btrim(_nome), '') = '' then
    return jsonb_build_object('ok', false, 'erro', 'Informe o nome do aluno.');
  end if;
  if not exists (select 1 from public.perfis p where p.id = _user_id) then
    return jsonb_build_object('ok', false, 'erro', 'Escolha o responsável do aluno.');
  end if;

  insert into public.alunos (user_id, nome, nascimento, idade)
  values (_user_id, btrim(_nome), _nascimento, _idade)
  returning id into v_id;

  if coalesce(_fisico, false) then
    update public.perfis
    set documentos_fisicos = true,
        aprovado = true,
        aprovado_em = coalesce(aprovado_em, now())
    where id = _user_id;
  end if;

  return jsonb_build_object('ok', true, 'aluno_id', v_id);
end;
$$;

create or replace function public.adm_listar_contratos()
returns table(
  id uuid,
  user_id uuid,
  aluno_id uuid,
  dados jsonb,
  created_at timestamptz,
  responsavel text,
  aluno text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not private.has_role(auth.uid(), 'adm'::app_role) then
    raise exception 'Acesso restrito à administração.';
  end if;

  return query
  select f.id,
         f.user_id,
         f.aluno_id,
         f.dados,
         f.created_at,
         coalesce(p.nome_responsavel, '')::text,
         coalesce(a.nome, f.dados->>'aluno', '')::text
  from public.fichas f
  left join public.perfis p on p.id = f.user_id
  left join public.alunos a on a.id = f.aluno_id
  where f.tipo = 'contrato'
  order by f.created_at desc;
end;
$$;

create or replace function public.adm_editar_contrato(_ficha_id uuid, _dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.has_role(auth.uid(), 'adm'::app_role) then
    return jsonb_build_object('ok', false, 'erro', 'Acesso restrito à administração.');
  end if;
  if _dados is null or jsonb_typeof(_dados) <> 'object' then
    return jsonb_build_object('ok', false, 'erro', 'Dados inválidos.');
  end if;

  update public.fichas
  set dados = dados || _dados
  where id = _ficha_id and tipo = 'contrato';

  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Contrato não encontrado.');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;
