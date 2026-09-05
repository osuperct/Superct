create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensagem text not null,
  autor_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select on public.avisos to authenticated;
grant insert, update, delete on public.avisos to authenticated;
grant all on public.avisos to service_role;
alter table public.avisos enable row level security;
create policy avisos_leitura_autenticada on public.avisos for select to authenticated using (true);
create policy avisos_professor_insert on public.avisos for insert to authenticated with check (private.has_role(auth.uid(), 'professor'::app_role) and autor_id = auth.uid());
create policy avisos_professor_update on public.avisos for update to authenticated using (private.has_role(auth.uid(), 'professor'::app_role)) with check (private.has_role(auth.uid(), 'professor'::app_role));
create policy avisos_professor_delete on public.avisos for delete to authenticated using (private.has_role(auth.uid(), 'professor'::app_role));

create table public.avisos_lidos (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references public.avisos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (aviso_id, user_id)
);
grant select, insert, delete on public.avisos_lidos to authenticated;
grant all on public.avisos_lidos to service_role;
alter table public.avisos_lidos enable row level security;
create policy avisos_lidos_own on public.avisos_lidos for select to authenticated using (user_id = auth.uid());
create policy avisos_lidos_insert_own on public.avisos_lidos for insert to authenticated with check (user_id = auth.uid());
create policy avisos_lidos_delete_own on public.avisos_lidos for delete to authenticated using (user_id = auth.uid());

alter publication supabase_realtime add table public.avisos;