alter table public.perfis
  add column if not exists aprovado boolean not null default false,
  add column if not exists aprovado_em timestamptz;

update public.perfis set aprovado = true, aprovado_em = coalesce(aprovado_em, now())
where aprovado = false;

drop function if exists public.adm_listar_acessos();

create or replace function public.adm_listar_acessos()
returns table (id uuid, email text, nome text, telefone text, professor boolean, adm boolean, aprovado boolean, criado_em timestamptz)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not private.has_role(auth.uid(), 'adm'::app_role) then
    raise exception 'Acesso restrito à administração.';
  end if;

  return query
  select u.id,
         coalesce(u.email, '')::text,
         coalesce(p.nome_responsavel, '')::text,
         coalesce(p.telefone, '')::text,
         exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'professor'::app_role),
         exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'adm'::app_role),
         coalesce(p.aprovado, false),
         u.created_at
  from auth.users u
  left join public.perfis p on p.id = u.id
  order by coalesce(p.aprovado, false), coalesce(nullif(p.nome_responsavel, ''), u.email);
end;
$$;

revoke all on function public.adm_listar_acessos() from public;
revoke execute on function public.adm_listar_acessos() from anon;
grant execute on function public.adm_listar_acessos() to authenticated;

create or replace function public.adm_definir_aprovacao(_user_id uuid, _aprovado boolean, _senha text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.has_role(auth.uid(), 'adm'::app_role) then
    return jsonb_build_object('ok', false, 'erro', 'Acesso restrito à administração.');
  end if;
  if not _aprovado then
    if coalesce(_senha, '') <> '2802' then
      return jsonb_build_object('ok', false, 'erro', 'Senha incorreta. Ação cancelada.');
    end if;
    if _user_id = auth.uid() then
      return jsonb_build_object('ok', false, 'erro', 'Você não pode bloquear a sua própria conta.');
    end if;
  end if;

  update public.perfis
  set aprovado = _aprovado,
      aprovado_em = case when _aprovado then now() else null end
  where id = _user_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.adm_definir_aprovacao(uuid, boolean, text) from public;
revoke execute on function public.adm_definir_aprovacao(uuid, boolean, text) from anon;
grant execute on function public.adm_definir_aprovacao(uuid, boolean, text) to authenticated;