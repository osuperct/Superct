create or replace function public.publicar_avaliacoes_do_mes(_referencia date default null::date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  v_chave text;
  v_n numeric;
  v_na numeric;
  v_publicadas int := 0;
  v_users uuid[] := '{}'::uuid[];
begin
  for r in
    select a.id, a.user_id
    from public.alunos a
    join public.perfis p on p.id = a.user_id
    where p.aprovado and p.bloqueado_em is null
      and (
        a.matricula is not null
        or exists (
          select 1 from public.mensalidades m
          where m.aluno_id = a.id and m.ativo
            and m.referencia >= date_trunc('month', v_ref)::date
            and m.referencia <= v_ref
        )
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
    order by (t.v)::numeric asc, t.k asc limit 1;

    v_media := public.media_das_notas(v_notas);
    select av.notas, public.media_das_notas(av.notas) into v_notas_ant, v_media_ant
    from public.avaliacoes av
    where av.aluno_id = r.id and av.referencia <= v_ant
    order by av.referencia desc limit 1;

    v_conq := '{}'::text[];

    for v_chave, v_n in select t.k, (t.v)::numeric from jsonb_each_text(v_notas) as t(k, v) loop
      if v_n >= 9 and public.conquista_desempenho(v_chave) is not null then
        v_conq := array_append(v_conq, public.conquista_desempenho(v_chave));
      end if;
      if v_n >= 9 and public.conquista_comportamento(v_chave) is not null then
        v_conq := array_append(v_conq, public.conquista_comportamento(v_chave));
      end if;
      if v_notas_ant is not null then
        v_na := nullif(v_notas_ant ->> v_chave, '')::numeric;
        if v_na is not null and (
          v_n - v_na >= 2
          or (v_na <= 3 and v_n >= 4)
          or (v_na <= 6 and v_n >= 7)
        ) then
          v_conq := array_append(v_conq, '📈 Evolução em ' || public.rotulo_criterio(v_chave));
        end if;
      end if;
    end loop;

    if v_media >= 9 then v_conq := array_prepend('🏆 Super Desempenho', v_conq); end if;
    if v_media_ant is not null and v_media - v_media_ant >= 1 then
      v_conq := array_append(v_conq, '📈 Grande Evolução');
    end if;

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
$function$;