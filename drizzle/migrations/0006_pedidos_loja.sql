CREATE TABLE public.pedidos_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  nome text NOT NULL,
  telefone text,
  produto_id uuid,
  produto_nome text NOT NULL,
  tamanho text,
  quantidade integer NOT NULL DEFAULT 1,
  valor_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.pedidos_loja TO anon;
GRANT SELECT, INSERT, UPDATE ON public.pedidos_loja TO authenticated;
GRANT ALL ON public.pedidos_loja TO service_role;

ALTER TABLE public.pedidos_loja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa registra pedido"
  ON public.pedidos_loja FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Equipe ve pedidos"
  ON public.pedidos_loja FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'professor'::app_role) OR public.has_role(auth.uid(), 'adm'::app_role));

CREATE POLICY "Equipe atualiza pedidos"
  ON public.pedidos_loja FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'professor'::app_role) OR public.has_role(auth.uid(), 'adm'::app_role));

CREATE TRIGGER pedidos_loja_updated_at
  BEFORE UPDATE ON public.pedidos_loja
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();