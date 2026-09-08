ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS documentos_fisicos boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.adm_definir_aprovacao(_user_id uuid, _aprovado boolean, _senha text DEFAULT ''::text, _fisico boolean DEFAULT null)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      aprovado_em = case when _aprovado then now() else null end,
      documentos_fisicos = coalesce(_fisico, documentos_fisicos)
  where id = _user_id;

  return jsonb_build_object('ok', true);
end;
$function$;

DROP FUNCTION IF EXISTS public.adm_listar_acessos();

CREATE FUNCTION public.adm_listar_acessos()
 RETURNS TABLE(id uuid, email text, nome text, telefone text, professor boolean, adm boolean, aprovado boolean, criado_em timestamp with time zone, documentos_fisicos boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
         u.created_at,
         coalesce(p.documentos_fisicos, false)
  from auth.users u
  left join public.perfis p on p.id = u.id
  order by coalesce(p.aprovado, false), coalesce(nullif(p.nome_responsavel, ''), u.email);
end;
$function$;