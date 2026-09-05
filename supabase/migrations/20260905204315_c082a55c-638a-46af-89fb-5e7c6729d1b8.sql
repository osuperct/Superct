CREATE TABLE public.produtos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  preco numeric NOT NULL DEFAULT 0,
  imagem_url text,
  pede_tamanho boolean NOT NULL DEFAULT false,
  tamanhos text[] NOT NULL DEFAULT '{}'::text[],
  link_pagamento text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.produtos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produtos_leitura_publica" ON public.produtos
  FOR SELECT TO anon, authenticated USING (ativo = true);

CREATE POLICY "produtos_adm_select" ON public.produtos
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'adm'::app_role));

CREATE POLICY "produtos_adm_insert" ON public.produtos
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'adm'::app_role));

CREATE POLICY "produtos_adm_update" ON public.produtos
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'adm'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'adm'::app_role));

CREATE POLICY "produtos_adm_delete" ON public.produtos
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'adm'::app_role));

CREATE TRIGGER produtos_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.produtos (nome, descricao, preco, pede_tamanho, tamanhos, ordem) VALUES
  ('Uniforme Super CT', 'Conjunto oficial de treino do Super CT.', 120.00, true,
   ARRAY['4','6','8','10','12','14','16','P','M','G','GG'], 1),
  ('Garrafa Super CT', 'Garrafa personalizada 700ml.', 45.00, false, '{}'::text[], 2),
  ('Camiseta Super CT', 'Camiseta personalizada do Super CT.', 70.00, true,
   ARRAY['4','6','8','10','12','14','16','P','M','G','GG'], 3);