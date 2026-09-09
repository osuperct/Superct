create or replace function public.conquista_desempenho(_criterio text)
returns text
language sql
immutable
as $$
  select case _criterio
    when 'forca_resistencia' then '🏆 Super Força'
    when 'velocidade_agilidade' then '🏆 Super Velocidade'
    when 'coordenacao_motora' then '🏆 Super Coordenação'
    when 'execucao_exercicios' then '🏆 Execução Perfeita'
    else null
  end
$$;

create or replace function public.conquista_comportamento(_criterio text)
returns text
language sql
immutable
as $$
  select case _criterio
    when 'comportamento' then '🎯 Comportamento Exemplar'
    when 'disciplina' then '🎯 Foco Total'
    when 'respeito_empatia' then '🎯 Parceiro de Equipe'
    else null
  end
$$;

create or replace function public.publicar_avaliacoes_do_mes(_referencia date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref date := coalesce(_referencia, (date_trunc('month', current_date) + interval '1 month - 1 day')::date);
  v_ant date := (date_trunc('month', v_ref) - interval '1 day')::date;
  r record;
  v_notas jsonb;
  v_notas_ant jsonb;
  v_meta text;
  v_media numeric;
  v_media_ant numeric;
  v_conq text[];
  v_extra text[];
  k text;
  v_n numeric;
  v_na numeric;
  v_publicadas int := 0;
  v_users uuid[] := '{}'::uuid[];
begin
  for r in
    select a.id, a.user_id
    from public.alunos a
    where a.matricula is not null
       or exists (
         select 1 from public.mensalidades m
         where m.aluno_id = a.id and m.ativo
           and m.referencia >= date_trunc('month', v_ref)::date
           and m.referencia <= v_ref
       )
  loop
    select av.notas, av.conquistas into v_notas, v_extra from public.avaliacoes av
    where av.aluno_id = r.id and av.referencia = v_ref;

    if v_notas is null or v_notas = '{}'::jsonb then
      select av.notas into v_notas from public.avaliacoes av
      where av.aluno_id = r.id and av.referencia <= v_ant
      order by av.referencia desc limit 1;
      v_extra := '{}'::text[];
    end if;

    if v_notas is null or v_notas = '{}'::jsonb then
      v_notas := jsonb_build_object(
        'coordenacao_motora', 6, 'forca_resistencia', 6, 'velocidade_agilidade', 6,
        'respeito_empatia', 6, 'disciplina', 6, 'comportamento', 6, 'execucao_exercicios', 6);
    end if;
    v_extra := coalesce(v_extra, '{}'::text[]);

    select public.rotulo_criterio(t.k) into v_meta
    from jsonb_each_text(v_notas) as t(k, v)
    order by (v)::numeric asc, k asc limit 1;

    v_media := public.media_das_notas(v_notas);
    select av.notas, public.media_das_notas(av.notas) into v_notas_ant, v_media_ant
    from public.avaliacoes av
    where av.aluno_id = r.id and av.referencia <= v_ant
    order by av.referencia desc limit 1;

    v_conq := '{}'::text[];

    -- 1) Desempenho: destaque por critério físico com nota 9+ e média alta
    for k, v_n in select t.k, (t.v)::numeric from jsonb_each_text(v_notas) as t(k, v) loop
      if v_n >= 9 and public.conquista_desempenho(k) is not null then
        v_conq := array_append(v_conq, public.conquista_desempenho(k));
      end if;
      -- 3) Comportamento/participação: critérios de atitude com nota 9+
      if v_n >= 9 and public.conquista_comportamento(k) is not null then
        v_conq := array_append(v_conq, public.conquista_comportamento(k));
      end if;
      -- 2) Evolução: critério melhorou 2+ pontos ou subiu de faixa em relação ao mês anterior
      if v_notas_ant is not null then
        v_na := nullif(v_notas_ant ->> k, '')::numeric;
        if v_na is not null and (
          v_n - v_na >= 2
          or (v_na <= 3 and v_n >= 4)
          or (v_na <= 6 and v_n >= 7)
        ) then
          v_conq := array_append(v_conq, '📈 Evolução em ' || public.rotulo_criterio(k));
        end if;
      end if;
    end loop;

    if v_media >= 9 then v_conq := array_prepend('🏆 Super Desempenho', v_conq); end if;
    if v_media_ant is not null and v_media - v_media_ant >= 1 then
      v_conq := array_append(v_conq, '📈 Grande Evolução');
    end if;

    -- mantém conquistas manuais dadas pelo professor
    v_conq := (select coalesce(array_agg(distinct c), '{}'::text[]) from unnest(v_conq || v_extra) as c);

    insert into public.avaliacoes (
      aluno_id, user_id, professor_id, referencia, notas, meta, conquistas, publicada, publicada_em)
    values (
      r.id, r.user_id,
      coalesce((select ur.user_id from public.user_roles ur where ur.role = 'professor'::app_role order by ur.created_at limit 1), r.user_id),
      v_ref, v_notas, v_meta, v_conq, true, now())
    on conflict (aluno_id, referencia) do update
      set notas = excluded.notas,
          meta = excluded.meta,
          conquistas = excluded.conquistas,
          publicada = true,
          publicada_em = coalesce(public.avaliacoes.publicada_em, now());

    v_publicadas := v_publicadas + 1;
    if not (r.user_id = any(v_users)) then v_users := array_append(v_users, r.user_id); end if;
  end loop;

  return jsonb_build_object('ok', true, 'referencia', v_ref, 'alunos', v_publicadas, 'responsaveis', v_users);
end;
$$;

revoke all on function public.conquista_desempenho(text) from public, anon, authenticated;
revoke all on function public.conquista_comportamento(text) from public, anon, authenticated;
revoke all on function public.publicar_avaliacoes_do_mes(date) from public, anon, authenticated;
grant execute on function public.conquista_desempenho(text) to service_role;
grant execute on function public.conquista_comportamento(text) to service_role;
grant execute on function public.publicar_avaliacoes_do_mes(date) to service_role;