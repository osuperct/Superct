-- Área interna, não exposta pela API
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Recriar políticas usando a função interna
DROP POLICY IF EXISTS "alunos_professor_read" ON public.alunos;
CREATE POLICY "alunos_professor_read" ON public.alunos FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'professor'::app_role));

DROP POLICY IF EXISTS "avaliacoes_professor_all" ON public.avaliacoes;
CREATE POLICY "avaliacoes_professor_all" ON public.avaliacoes FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'professor'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'professor'::app_role));

DROP POLICY IF EXISTS "documentos_professor_read" ON public.documentos;
CREATE POLICY "documentos_professor_read" ON public.documentos FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'professor'::app_role));

DROP POLICY IF EXISTS "documentos_professor_insert" ON public.documentos;
CREATE POLICY "documentos_professor_insert" ON public.documentos FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'professor'::app_role));

DROP POLICY IF EXISTS "documentos_professor_delete" ON public.documentos;
CREATE POLICY "documentos_professor_delete" ON public.documentos FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'professor'::app_role));

DROP POLICY IF EXISTS "documentos_professor_update" ON public.documentos;
CREATE POLICY "documentos_professor_update" ON public.documentos FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'professor'::app_role)
  AND (aluno_id IS NULL OR EXISTS (
    SELECT 1 FROM public.alunos a WHERE a.id = documentos.aluno_id AND a.user_id = documentos.user_id))
)
WITH CHECK (
  private.has_role(auth.uid(), 'professor'::app_role)
  AND (aluno_id IS NULL OR EXISTS (
    SELECT 1 FROM public.alunos a WHERE a.id = documentos.aluno_id AND a.user_id = documentos.user_id))
);

DROP POLICY IF EXISTS "fichas_professor_read" ON public.fichas;
CREATE POLICY "fichas_professor_read" ON public.fichas FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'professor'::app_role));

DROP POLICY IF EXISTS "mensalidades_professor_all" ON public.mensalidades;
CREATE POLICY "mensalidades_professor_all" ON public.mensalidades FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'professor'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'professor'::app_role));

DROP POLICY IF EXISTS "perfis_professor_read" ON public.perfis;
CREATE POLICY "perfis_professor_read" ON public.perfis FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'professor'::app_role));

DROP POLICY IF EXISTS "user_roles_adm_select" ON public.user_roles;
CREATE POLICY "user_roles_adm_select" ON public.user_roles FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'adm'::app_role));

DROP POLICY IF EXISTS "user_roles_adm_insert" ON public.user_roles;
CREATE POLICY "user_roles_adm_insert" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'adm'::app_role));

DROP POLICY IF EXISTS "user_roles_adm_delete" ON public.user_roles;
CREATE POLICY "user_roles_adm_delete" ON public.user_roles FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'adm'::app_role));

-- Arquivos (storage): mesmas regras, agora com a função interna
DROP POLICY IF EXISTS "documentos_alunos_professor_read" ON storage.objects;
CREATE POLICY "documentos_alunos_professor_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos-alunos'::text AND private.has_role(auth.uid(), 'professor'::app_role));

DROP POLICY IF EXISTS "docs_alunos_professor_insert" ON storage.objects;
CREATE POLICY "docs_alunos_professor_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos-alunos'::text AND private.has_role(auth.uid(), 'professor'::app_role));

DROP POLICY IF EXISTS "docs_alunos_professor_delete" ON storage.objects;
CREATE POLICY "docs_alunos_professor_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos-alunos'::text AND private.has_role(auth.uid(), 'professor'::app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Ranking público sem visão privilegiada: view respeita o usuário, com colunas limitadas
DROP VIEW IF EXISTS public.ranking_publico;

GRANT SELECT (apelido, pontos, fase, updated_at) ON public.ranking_jogo TO anon;

CREATE POLICY "ranking_leitura_publica_limitada"
ON public.ranking_jogo FOR SELECT TO anon
USING (true);

CREATE VIEW public.ranking_publico
WITH (security_invoker = true) AS
SELECT apelido, pontos, fase, updated_at
FROM public.ranking_jogo;

GRANT SELECT ON public.ranking_publico TO anon, authenticated;