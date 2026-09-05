drop policy if exists perfis_professor_read on public.perfis;
create policy perfis_professor_read on public.perfis
for select to authenticated
using (
  private.has_role(auth.uid(), 'professor'::app_role)
  and (id = auth.uid() or private.eh_conta_familia(id))
);