revoke execute on function public.adm_listar_acessos() from anon;
revoke execute on function public.adm_definir_acesso(uuid, app_role, boolean, text) from anon;
revoke execute on function public.adm_excluir_conta(uuid, text) from anon;