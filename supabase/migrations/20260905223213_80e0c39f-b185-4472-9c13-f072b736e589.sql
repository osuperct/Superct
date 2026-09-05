drop policy if exists app_midias_leitura on storage.objects;
create policy app_midias_leitura on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'app-midias'
  and (
    private.has_role(auth.uid(), 'adm'::app_role)
    or exists (select 1 from public.midias_app m where m.caminho = storage.objects.name and m.ativo)
  )
);