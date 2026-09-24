CREATE TABLE public.assinaturas_eletronicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  email text,
  nome_assinante text,
  ip text,
  user_agent text,
  assinado_em timestamptz NOT NULL DEFAULT now(),
  login_verificado boolean NOT NULL DEFAULT true,
  ultimo_login timestamptz,
  biometria boolean NOT NULL DEFAULT false,
  biometria_credencial text,
  hash_documento text NOT NULL,
  caminho text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.assinaturas_eletronicas TO authenticated;
GRANT ALL ON public.assinaturas_eletronicas TO service_role;
ALTER TABLE public.assinaturas_eletronicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assinatura_insert_propria" ON public.assinaturas_eletronicas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "assinatura_select" ON public.assinaturas_eletronicas FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'professor'::app_role) OR public.has_role(auth.uid(), 'adm'::app_role));