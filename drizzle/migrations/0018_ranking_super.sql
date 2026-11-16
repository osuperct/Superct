CREATE OR REPLACE FUNCTION public.ranking_super()
RETURNS TABLE(modalidade text, grupo text, aluno text, valor numeric, meu boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
begin
  if auth.uid() is null or not (
    private.has_role(auth.uid(), 'professor'::app_role) or private.has_role(auth.uid(), 'adm'::app_role)
    or exists (select 1 from public.perfis p where p.id = auth.uid() and p.aprovado and p.bloqueado_em is null)
  ) then
    raise exception 'Acesso não liberado';
  end if;
  return query
  with base as (
    select s.*, a.nome, a.user_id as dono
    from public.avaliacoes_super s
    join public.alunos a on a.id = s.aluno_id
    join public.perfis p on p.id = a.user_id
    where p.bloqueado_em is null and s.tipo in ('corrida','salto')
  ), r as (
    select 'corrida'::text m, (dados->>'voltas') g, aluno_id, nome, dono, min((dados->>'tempo_ms')::numeric) v
      from base where tipo='corrida' and dados ? 'tempo_ms' group by 2, aluno_id, nome, dono
    union all
    select 'distancia', 'distancia', aluno_id, nome, dono, max((dados->>'metros')::numeric)
      from base where tipo='salto' and dados->>'modo'='distancia' group by aluno_id, nome, dono
    union all
    select 'caixa', dados->>'caixa', aluno_id, nome, dono, max((dados->>'tempo_ms')::numeric)
      from base where tipo='salto' and dados->>'modo'='caixa' group by 2, aluno_id, nome, dono
  )
  select r.m, r.g,
    (split_part(btrim(r.nome),' ',1) || coalesce(' ' || nullif(left(split_part(btrim(r.nome),' ',2),1),'') || '.', ''))::text,
    r.v, r.dono = auth.uid()
  from r;
end $$;
REVOKE ALL ON FUNCTION public.ranking_super() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ranking_super() TO authenticated;