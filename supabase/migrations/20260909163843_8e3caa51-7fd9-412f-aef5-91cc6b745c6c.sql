create extension if not exists pg_net with schema extensions;

-- 1) Novas colunas da avaliação por estrelas
alter table public.avaliacoes
  add column if not exists notas jsonb not null default '{}'::jsonb,
  add column if not exists publicada boolean not null default false,
  add column if not exists publicada_em timestamptz,
  add column if not exists meta text,
  add column if not exists conquistas text[] not null default '{}'::text[];

alter table public.avaliacoes
  alter column coordenacao_motora set default 'amarelo',
  alter column forca_resistencia set default 'amarelo',
  alter column velocidade_agilidade set default 'amarelo',
  alter column respeito_empatia set default 'amarelo',
  alter column disciplina set default 'amarelo',
  alter column comportamento set default 'amarelo',
  alter column execucao_exercicios set default 'amarelo';

-- 2) Cor derivada da nota em estrelas
create or replace function public.cor_da_nota(_nota numeric)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when _nota is null then 'amarelo'
    when _nota <= 3 then 'vermelho'
    when _nota <= 6 then 'amarelo'
    else 'verde'
  end;
$$;

create or replace function public.avaliacoes_sincronizar_cores()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  k text;
begin
  if new.notas is null or jsonb_typeof(new.notas) <> 'object' then
    new.notas := '{}'::jsonb;
  end if;
  foreach k in array array['coordenacao_motora','forca_resistencia','velocidade_agilidade',
                           'respeito_empatia','disciplina','comportamento','execucao_exercicios']
  loop
    if (new.notas ->> k) is not null then
      new.notas := jsonb_set(
        new.notas, array[k],
        to_jsonb(greatest(1, least(10, round((new.notas ->> k)::numeric)::int)))
      );
      case k
        when 'coordenacao_motora' then new.coordenacao_motora := public.cor_da_nota((new.notas->>k)::numeric);
        when 'forca_resistencia' then new.forca_resistencia := public.cor_da_nota((new.notas->>k)::numeric);
        when 'velocidade_agilidade' then new.velocidade_agilidade := public.cor_da_nota((new.notas->>k)::numeric);
        when 'respeito_empatia' then new.respeito_empatia := public.cor_da_nota((new.notas->>k)::numeric);
        when 'disciplina' then new.disciplina := public.cor_da_nota((new.notas->>k)::numeric);
        when 'comportamento' then new.comportamento := public.cor_da_nota((new.notas->>k)::numeric);
        when 'execucao_exercicios' then new.execucao_exercicios := public.cor_da_nota((new.notas->>k)::numeric);
      end case;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists avaliacoes_cores on public.avaliacoes;
create trigger avaliacoes_cores
  before insert or update on public.avaliacoes
  for each row execute function public.avaliacoes_sincronizar_cores();

-- 3) Converte as avaliações antigas (cores) em estrelas
update public.avaliacoes
set notas = jsonb_build_object(
      'coordenacao_motora', case coordenacao_motora when 'vermelho' then 3 when 'verde' then 9 else 6 end,
      'forca_resistencia', case forca_resistencia when 'vermelho' then 3 when 'verde' then 9 else 6 end,
      'velocidade_agilidade', case velocidade_agilidade when 'vermelho' then 3 when 'verde' then 9 else 6 end,
      'respeito_empatia', case respeito_empatia when 'vermelho' then 3 when 'verde' then 9 else 6 end,
      'disciplina', case disciplina when 'vermelho' then 3 when 'verde' then 9 else 6 end,
      'comportamento', case comportamento when 'vermelho' then 3 when 'verde' then 9 else 6 end,
      'execucao_exercicios', case execucao_exercicios when 'vermelho' then 3 when 'verde' then 9 else 6 end
    ),
    publicada = true,
    publicada_em = coalesce(publicada_em, created_at)
where notas = '{}'::jsonb;

-- 4) Rótulos e cálculos de meta/conquistas
create or replace function public.rotulo_criterio(_chave text)
returns text
language sql
immutable
set search_path = public
as $$
  select case _chave
    when 'coordenacao_motora' then 'Coordenação motora'
    when 'forca_resistencia' then 'Força e resistência'
    when 'velocidade_agilidade' then 'Velocidade e agilidade'
    when 'respeito_empatia' then 'Respeito e empatia'
    when 'disciplina' then 'Disciplina'
    when 'comportamento' then 'Comportamento'
    when 'execucao_exercicios' then 'Execução dos exercícios'
    else _chave
  end;
$$;

create or replace function public.media_das_notas(_notas jsonb)
returns numeric
language sql
immutable
set search_path = public
as $$
  select round(avg((v)::numeric), 2)
  from jsonb_each_text(coalesce(_notas, '{}'::jsonb)) as t(k, v);
$$;

-- 5) Publicação automática da avaliação do mês
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
  v_meta text;
  v_media numeric;
  v_media_ant numeric;
  v_conq text[];
  v_criadas int := 0;
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
    select av.notas into v_notas from public.avaliacoes av
    where av.aluno_id = r.id and av.referencia = v_ref;

    if v_notas is null or v_notas = '{}'::jsonb then
      select av.notas into v_notas from public.avaliacoes av
      where av.aluno_id = r.id and av.referencia <= v_ant
      order by av.referencia desc limit 1;
    end if;

    if v_notas is null or v_notas = '{}'::jsonb then
      v_notas := jsonb_build_object(
        'coordenacao_motora', 6, 'forca_resistencia', 6, 'velocidade_agilidade', 6,
        'respeito_empatia', 6, 'disciplina', 6, 'comportamento', 6, 'execucao_exercicios', 6);
    end if;

    select public.rotulo_criterio(k) into v_meta
    from jsonb_each_text(v_notas) as t(k, v)
    order by (v)::numeric asc, k asc limit 1;

    v_media := public.media_das_notas(v_notas);
    select public.media_das_notas(av.notas) into v_media_ant
    from public.avaliacoes av
    where av.aluno_id = r.id and av.referencia <= v_ant
    order by av.referencia desc limit 1;

    v_conq := '{}'::text[];
    if v_media >= 9 then v_conq := array_append(v_conq, 'Medalha de Ouro');
    elsif v_media >= 7.5 then v_conq := array_append(v_conq, 'Medalha de Prata');
    elsif v_media >= 6 then v_conq := array_append(v_conq, 'Medalha de Bronze');
    end if;
    if v_media_ant is not null and v_media > v_media_ant then
      v_conq := array_append(v_conq, 'Em evolução');
    end if;
    if (select min((v)::numeric) from jsonb_each_text(v_notas) as t(k, v)) >= 7 then
      v_conq := array_append(v_conq, 'Time completo (tudo ótimo)');
    end if;

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

    v_criadas := v_criadas + 1;
    v_publicadas := v_publicadas + 1;
    if not (r.user_id = any(v_users)) then v_users := array_append(v_users, r.user_id); end if;
  end loop;

  return jsonb_build_object('ok', true, 'referencia', v_ref, 'alunos', v_publicadas, 'responsaveis', v_users);
end;
$$;

revoke all on function public.publicar_avaliacoes_do_mes(date) from public, anon, authenticated;
grant execute on function public.publicar_avaliacoes_do_mes(date) to service_role;

-- 6) Token da rotina automática (guardado no vault) + validação para a rota /api/public
do $$
declare v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not exists (select 1 from vault.secrets where name = 'avaliacao_cron_token') then
    perform vault.create_secret(v_token, 'avaliacao_cron_token', 'Token da rotina mensal de avaliações');
  end if;
end $$;

create or replace function public.cron_token_valido(_token text)
returns boolean
language plpgsql
security definer
set search_path = public, vault
as $$
declare v text;
begin
  select decrypted_secret into v from vault.decrypted_secrets where name = 'avaliacao_cron_token';
  return v is not null and coalesce(_token, '') = v;
end;
$$;

revoke all on function public.cron_token_valido(text) from public, anon, authenticated;
grant execute on function public.cron_token_valido(text) to service_role;

-- 7) Agenda: dia 28 às 20:00 de Brasília (23:00 UTC)
select cron.unschedule('avaliacao-mensal-super-ct')
where exists (select 1 from cron.job where jobname = 'avaliacao-mensal-super-ct');

select cron.schedule(
  'avaliacao-mensal-super-ct',
  '0 23 28 * *',
  $cron$
  select extensions.http_post(
    url := 'https://project--f98de061-dc8c-43b5-9c7f-56210aba7b2d.lovable.app/api/public/avaliacao-mensal',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'avaliacao_cron_token')
    ),
    body := '{}'::jsonb
  );
  $cron$
);