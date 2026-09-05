CREATE TABLE public.midias_app (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'foto',
  grupo text NOT NULL,
  caminho text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  com_som boolean NOT NULL DEFAULT false,
  inicio numeric NOT NULL DEFAULT 0,
  fim numeric,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.midias_app TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.midias_app TO authenticated;
GRANT ALL ON public.midias_app TO service_role;

ALTER TABLE public.midias_app ENABLE ROW LEVEL SECURITY;

CREATE POLICY "midias_leitura_publica" ON public.midias_app FOR SELECT TO anon, authenticated
  USING (ativo = true);
CREATE POLICY "midias_adm_select" ON public.midias_app FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'adm'::app_role));
CREATE POLICY "midias_adm_insert" ON public.midias_app FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'adm'::app_role));
CREATE POLICY "midias_adm_update" ON public.midias_app FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'adm'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'adm'::app_role));
CREATE POLICY "midias_adm_delete" ON public.midias_app FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'adm'::app_role));

CREATE TRIGGER midias_app_updated_at BEFORE UPDATE ON public.midias_app
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "app_midias_leitura" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'app-midias');
CREATE POLICY "app_midias_adm_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'app-midias' AND private.has_role(auth.uid(), 'adm'::app_role));
CREATE POLICY "app_midias_adm_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'app-midias' AND private.has_role(auth.uid(), 'adm'::app_role))
  WITH CHECK (bucket_id = 'app-midias' AND private.has_role(auth.uid(), 'adm'::app_role));
CREATE POLICY "app_midias_adm_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'app-midias' AND private.has_role(auth.uid(), 'adm'::app_role));