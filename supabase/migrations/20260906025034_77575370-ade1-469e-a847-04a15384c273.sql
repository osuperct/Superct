create or replace function public.adm_listar_acessos()
returns table (id uuid, email text, nome text, professor boolean, adm boolean)
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
         exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'professor'::app_role),
         exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'adm'::app_role)
  from auth.users u
  left join public.perfis p on p.id = u.id
  order by coalesce(nullif(p.nome_responsavel, ''), u.email);
end;
$$;

revoke all on function public.adm_listar_acessos() from public;
grant execute on function public.adm_listar_acessos() to authenticated;

create or replace function public.adm_definir_acesso(_user_id uuid, _papel app_role, _liberar boolean, _senha text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.has_role(auth.uid(), 'adm'::app_role) then
    return jsonb_build_object('ok', false, 'erro', 'Acesso restrito à administração.');
  end if;

  if not _liberar then
    if coalesce(_senha, '') <> '2802' then
      return jsonb_build_object('ok', false, 'erro', 'Senha incorreta. Ação cancelada.');
    end if;
    if _user_id = auth.uid() and _papel = 'adm'::app_role then
      return jsonb_build_object('ok', false, 'erro', 'Você não pode remover o seu próprio acesso ADM.');
    end if;
  end if;

  if _liberar then
    insert into public.user_roles (user_id, role) values (_user_id, _papel)
    on conflict (user_id, role) do nothing;
  else
    delete from public.user_roles where user_id = _user_id and role = _papel;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.adm_definir_acesso(uuid, app_role, boolean, text) from public;
grant execute on function public.adm_definir_acesso(uuid, app_role, boolean, text) to authenticated;

create or replace function public.adm_excluir_conta(_user_id uuid, _senha text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not private.has_role(auth.uid(), 'adm'::app_role) then
    return jsonb_build_object('ok', false, 'erro', 'Acesso restrito à administração.');
  end if;
  if coalesce(_senha, '') <> '2802' then
    return jsonb_build_object('ok', false, 'erro', 'Senha incorreta. Exclusão cancelada.');
  end if;
  if _user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'erro', 'Você não pode excluir a sua própria conta.');
  end if;

  delete from public.user_roles where user_id = _user_id;
  delete from auth.users where id = _user_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.adm_excluir_conta(uuid, text) from public;
grant execute on function public.adm_excluir_conta(uuid, text) to authenticated;