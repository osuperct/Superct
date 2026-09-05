-- 1. ranking_jogo: remover leitura pública da tabela (que expunha user_id)
DROP POLICY IF EXISTS "ranking_publico_leitura" ON public.ranking_jogo;

CREATE POLICY "ranking_leitura_autenticada"
ON public.ranking_jogo FOR SELECT TO authenticated
USING (true);

REVOKE SELECT ON public.ranking_jogo FROM anon;

-- Lista pública sem identificadores de conta
CREATE OR REPLACE VIEW public.ranking_publico
WITH (security_invoker = false) AS
SELECT apelido, pontos, fase, updated_at
FROM public.ranking_jogo;

GRANT SELECT ON public.ranking_publico TO anon, authenticated;

-- 2. documentos: professor só atualiza documentos cujo aluno pertence ao mesmo responsável
DROP POLICY IF EXISTS "documentos_professor_update" ON public.documentos;

CREATE POLICY "documentos_professor_update"
ON public.documentos FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'professor'::app_role)
  AND (
    aluno_id IS NULL
    OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = documentos.aluno_id AND a.user_id = documentos.user_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'professor'::app_role)
  AND (
    aluno_id IS NULL
    OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = documentos.aluno_id AND a.user_id = documentos.user_id)
  )
);

-- 3. funções SECURITY DEFINER de gatilho: não devem ser chamáveis pela API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;