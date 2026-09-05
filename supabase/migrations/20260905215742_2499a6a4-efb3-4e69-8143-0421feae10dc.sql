CREATE TABLE public.textos_app (
  chave text PRIMARY KEY,
  valor text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.textos_app TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.textos_app TO authenticated;
GRANT ALL ON public.textos_app TO service_role;

ALTER TABLE public.textos_app ENABLE ROW LEVEL SECURITY;

CREATE POLICY textos_leitura_publica ON public.textos_app FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY textos_adm_insert ON public.textos_app FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'adm'::app_role));
CREATE POLICY textos_adm_update ON public.textos_app FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'adm'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'adm'::app_role));
CREATE POLICY textos_adm_delete ON public.textos_app FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'adm'::app_role));

CREATE TRIGGER textos_app_updated_at BEFORE UPDATE ON public.textos_app FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.textos_app (chave, valor) VALUES
  ('hero_titulo', 'SUA CRIANÇA VIRA SUPER!'),
  ('hero_subtitulo', 'Treinamento funcional infantil e recreativo, ginástica, esportes e circuitos com o Professor Tio Victor.');