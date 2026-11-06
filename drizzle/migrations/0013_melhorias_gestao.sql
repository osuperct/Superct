ALTER TABLE public.avisos ADD COLUMN IF NOT EXISTS alunos_destino uuid[];
DROP POLICY IF EXISTS avisos_leitura_autenticada ON public.avisos;
CREATE POLICY avisos_leitura_autenticada ON public.avisos FOR SELECT TO authenticated USING (
  alunos_destino IS NULL
  OR private.has_role(auth.uid(), 'professor'::app_role)
  OR private.has_role(auth.uid(), 'adm'::app_role)
  OR EXISTS (SELECT 1 FROM public.alunos a WHERE a.user_id = auth.uid() AND a.id = ANY(avisos.alunos_destino))
);

ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS pagamento_conferido_em timestamptz;

CREATE TABLE public.lembretes_vencimento (
  aluno_id uuid NOT NULL,
  referencia date NOT NULL,
  tipo text NOT NULL,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (aluno_id, referencia, tipo)
);
GRANT ALL ON public.lembretes_vencimento TO service_role;
ALTER TABLE public.lembretes_vencimento ENABLE ROW LEVEL SECURITY;