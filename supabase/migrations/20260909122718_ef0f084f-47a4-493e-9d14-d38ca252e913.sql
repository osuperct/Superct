-- Extrai o valor numérico de um texto de plano ("Plano anual 12x de R$140,00" -> 140.00)
create or replace function public.valor_do_plano(_texto text)
returns numeric
language sql
immutable
set search_path = public
as $$
  select nullif(
    replace(replace((regexp_match(coalesce(_texto, ''), 'R\$\s*([0-9.]+,[0-9]{2}|[0-9]+)'))[1], '.', ''), ',', '.'),
    ''
  )::numeric
$$;

-- Cadastro de aluno pelo professor, agora com plano/forma/vencimento do contrato físico
drop function if exists public.prof_criar_aluno(uuid, text, date, integer, boolean);

create or replace function public.prof_criar_aluno(
  _user_id uuid,
  _nome text,
  _nascimento date default null,
  _idade integer default null,
  _fisico boolean default false,
  _plano text default '',
  _forma text default '',
  _vencimento text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_resp text;
begin
  if not private.has_role(auth.uid(), 'professor'::app_role) then
    return jsonb_build_object('ok', false, 'erro', 'Acesso restrito ao professor.');
  end if;
  if coalesce(btrim(_nome), '') = '' then
    return jsonb_build_object('ok', false, 'erro', 'Informe o nome do aluno.');
  end if;
  select coalesce(p.nome_responsavel, '') into v_resp from public.perfis p where p.id = _user_id;
  if not found then
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

  if coalesce(btrim(_plano), '') <> '' or coalesce(btrim(_forma), '') <> '' then
    insert into public.fichas (user_id, aluno_id, tipo, dados, enviado_em)
    values (
      _user_id,
      v_id,
      'contrato',
      jsonb_build_object(
        'aluno', btrim(_nome),
        'aluno_nascimento', coalesce(to_char(_nascimento, 'YYYY-MM-DD'), ''),
        'contratante', v_resp,
        'valor', coalesce(btrim(_plano), ''),
        'forma_pagamento', coalesce(btrim(_forma), ''),
        'vencimento', coalesce(btrim(_vencimento), ''),
        'data_inicio', to_char(current_date, 'YYYY-MM-DD'),
        'observacoes', 'Contrato físico (papel)'
      ),
      now()
    );
  end if;

  return jsonb_build_object('ok', true, 'aluno_id', v_id);
end;
$$;

-- Lista de contratos: cria a ficha que falta para os alunos de contrato físico
create or replace function public.adm_listar_contratos()
returns table(id uuid, user_id uuid, aluno_id uuid, dados jsonb, created_at timestamp with time zone, responsavel text, aluno text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.has_role(auth.uid(), 'adm'::app_role) then
    raise exception 'Acesso restrito à administração.';
  end if;

  insert into public.fichas (user_id, aluno_id, tipo, dados, enviado_em)
  select a.user_id,
         a.id,
         'contrato',
         jsonb_build_object(
           'aluno', a.nome,
           'aluno_nascimento', coalesce(to_char(a.nascimento, 'YYYY-MM-DD'), ''),
           'contratante', coalesce(p.nome_responsavel, ''),
           'valor', case when m.valor is not null
                         then 'Outro valor — R$ ' || replace(to_char(m.valor, 'FM999999990.00'), '.', ',')
                         else '' end,
           'forma_pagamento', coalesce(m.forma, ''),
           'vencimento', '',
           'data_inicio', to_char(a.created_at, 'YYYY-MM-DD'),
           'observacoes', 'Contrato físico (papel)'
         ),
         now()
  from public.alunos a
  join public.perfis p on p.id = a.user_id and p.documentos_fisicos
  left join lateral (
    select mm.valor, mm.forma from public.mensalidades mm
    where mm.aluno_id = a.id order by mm.referencia desc limit 1
  ) m on true
  where not exists (
    select 1 from public.fichas f where f.aluno_id = a.id and f.tipo = 'contrato'
  );

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

-- Correção de contrato: sincroniza valor e forma nas mensalidades em aberto
create or replace function public.adm_editar_contrato(_ficha_id uuid, _dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aluno uuid;
  v_valor numeric;
  v_forma text;
begin
  if not private.has_role(auth.uid(), 'adm'::app_role) then
    return jsonb_build_object('ok', false, 'erro', 'Acesso restrito à administração.');
  end if;
  if _dados is null or jsonb_typeof(_dados) <> 'object' then
    return jsonb_build_object('ok', false, 'erro', 'Dados inválidos.');
  end if;

  update public.fichas
  set dados = dados || _dados
  where id = _ficha_id and tipo = 'contrato'
  returning aluno_id,
            public.valor_do_plano((dados || _dados)->>'valor'),
            nullif(btrim(coalesce((dados || _dados)->>'forma_pagamento', '')), '')
  into v_aluno, v_valor, v_forma;

  if not found then
    return jsonb_build_object('ok', false, 'erro', 'Contrato não encontrado.');
  end if;

  if v_aluno is not null then
    update public.mensalidades
    set valor = coalesce(v_valor, valor),
        forma = coalesce(v_forma, forma)
    where aluno_id = v_aluno
      and not pago
      and referencia >= date_trunc('month', current_date)::date;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;