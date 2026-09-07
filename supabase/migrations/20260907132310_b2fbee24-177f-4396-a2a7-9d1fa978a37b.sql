create or replace function public.cpf_disponivel(_cpf text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.perfis
    where cpf = nullif(regexp_replace(coalesce(_cpf,''), '\D', '', 'g'), '')
  );
$$;

revoke all on function public.cpf_disponivel(text) from public;
grant execute on function public.cpf_disponivel(text) to anon, authenticated, service_role;