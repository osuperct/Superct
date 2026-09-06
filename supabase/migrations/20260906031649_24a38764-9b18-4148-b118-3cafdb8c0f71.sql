create or replace function public.vincular_alunos_dos_contratos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_aluno uuid;
  v_nome text;
  v_nasc date;
  v_total int := 0;
begin
  if not private.has_role(auth.uid(), 'professor'::app_role) then
    raise exception 'Acesso restrito ao professor.';
  end if;

  for r in
    select f.id, f.user_id, f.dados
    from public.fichas f
    where f.tipo = 'contrato' and f.aluno_id is null
    order by f.created_at
  loop
    v_nome := btrim(coalesce(r.dados->>'aluno', r.dados->>'aluno_nome', ''));
    if v_nome = '' then continue; end if;

    begin
      v_nasc := nullif(r.dados->>'aluno_nascimento', '')::date;
    exception when others then
      v_nasc := null;
    end;

    select a.id into v_aluno
    from public.alunos a
    where a.user_id = r.user_id and lower(btrim(a.nome)) = lower(v_nome)
    limit 1;

    if v_aluno is null then
      insert into public.alunos (user_id, nome, nascimento)
      values (r.user_id, v_nome, v_nasc)
      returning id into v_aluno;
    elsif v_nasc is not null then
      update public.alunos set nascimento = coalesce(nascimento, v_nasc) where id = v_aluno;
    end if;

    update public.fichas set aluno_id = v_aluno where id = r.id;
    update public.fichas set aluno_id = v_aluno
      where user_id = r.user_id and aluno_id is null and tipo <> 'contrato';
    update public.documentos set aluno_id = v_aluno
      where user_id = r.user_id and aluno_id is null;

    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

revoke all on function public.vincular_alunos_dos_contratos() from public, anon;
grant execute on function public.vincular_alunos_dos_contratos() to authenticated;

do $$
declare
  r record;
  v_aluno uuid;
  v_nome text;
  v_nasc date;
begin
  for r in
    select f.id, f.user_id, f.dados
    from public.fichas f
    where f.tipo = 'contrato' and f.aluno_id is null
    order by f.created_at
  loop
    v_nome := btrim(coalesce(r.dados->>'aluno', r.dados->>'aluno_nome', ''));
    if v_nome = '' then continue; end if;
    begin
      v_nasc := nullif(r.dados->>'aluno_nascimento', '')::date;
    exception when others then
      v_nasc := null;
    end;

    select a.id into v_aluno from public.alunos a
    where a.user_id = r.user_id and lower(btrim(a.nome)) = lower(v_nome) limit 1;

    if v_aluno is null then
      insert into public.alunos (user_id, nome, nascimento)
      values (r.user_id, v_nome, v_nasc) returning id into v_aluno;
    end if;

    update public.fichas set aluno_id = v_aluno where id = r.id;
    update public.fichas set aluno_id = v_aluno
      where user_id = r.user_id and aluno_id is null and tipo <> 'contrato';
    update public.documentos set aluno_id = v_aluno
      where user_id = r.user_id and aluno_id is null;
  end loop;
end $$;