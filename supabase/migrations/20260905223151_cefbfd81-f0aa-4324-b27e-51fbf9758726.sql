-- helper: conta de família (não pertence à equipe)
create or replace function private.eh_conta_familia(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('adm'::app_role, 'professor'::app_role)
  )
$$;

revoke all on function private.eh_conta_familia(uuid) from public, anon, authenticated;

-- alunos
drop policy if exists alunos_professor_read on public.alunos;
create policy alunos_professor_read on public.alunos
for select to authenticated
using (private.has_role(auth.uid(), 'professor'::app_role) and private.eh_conta_familia(user_id));

-- perfis
drop policy if exists perfis_professor_read on public.perfis;
create policy perfis_professor_read on public.perfis
for select to authenticated
using (
  private.has_role(auth.uid(), 'professor'::app_role)
  and (id = auth.uid() or (private.eh_conta_familia(id) and exists (select 1 from public.alunos a where a.user_id = perfis.id)))
);

-- mensalidades: sem DELETE para professor
drop policy if exists mensalidades_professor_all on public.mensalidades;
create policy mensalidades_professor_select on public.mensalidades
for select to authenticated
using (private.has_role(auth.uid(), 'professor'::app_role) and private.eh_conta_familia(user_id));
create policy mensalidades_professor_insert on public.mensalidades
for insert to authenticated
with check (private.has_role(auth.uid(), 'professor'::app_role) and private.eh_conta_familia(user_id));
create policy mensalidades_professor_update on public.mensalidades
for update to authenticated
using (private.has_role(auth.uid(), 'professor'::app_role) and private.eh_conta_familia(user_id))
with check (private.has_role(auth.uid(), 'professor'::app_role) and private.eh_conta_familia(user_id));

-- ranking: remove política pública residual (leitura pública usa a view ranking_publico)
drop policy if exists ranking_leitura_publica_limitada on public.ranking_jogo;

-- storage: leitura apenas de arquivos realmente em uso
drop policy if exists app_midias_leitura on storage.objects;
create policy app_midias_leitura on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'app-midias'
  and exists (select 1 from public.midias_app m where m.caminho = storage.objects.name and m.ativo)
);

drop policy if exists avisos_img_leitura on storage.objects;
create policy avisos_img_leitura on storage.objects
for select to authenticated
using (
  bucket_id = 'avisos'
  and (
    private.has_role(auth.uid(), 'professor'::app_role)
    or exists (select 1 from public.avisos a where a.imagem_url = storage.objects.name)
  )
);