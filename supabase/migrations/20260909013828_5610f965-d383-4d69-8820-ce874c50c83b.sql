revoke execute on function public.prof_criar_aluno(uuid, text, date, int, boolean) from anon;
revoke execute on function public.adm_listar_contratos() from anon;
revoke execute on function public.adm_editar_contrato(uuid, jsonb) from anon;
revoke execute on function public.adm_definir_acesso(uuid, app_role, boolean, text) from anon;
revoke execute on function public.adm_definir_aprovacao(uuid, boolean, text, boolean) from anon;
revoke execute on function public.adm_excluir_conta(uuid, text) from anon;
revoke execute on function public.adm_listar_acessos() from anon;
revoke execute on function public.vincular_alunos_dos_contratos() from anon;
