CREATE TABLE public.turmas_app (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma text NOT NULL DEFAULT '',
  horario text NOT NULL DEFAULT '',
  idade text NOT NULL DEFAULT '',
  dias text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.turmas_app TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turmas_app TO authenticated;
GRANT ALL ON public.turmas_app TO service_role;

ALTER TABLE public.turmas_app ENABLE ROW LEVEL SECURITY;

CREATE POLICY turmas_leitura_publica ON public.turmas_app FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY turmas_adm_insert ON public.turmas_app FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'adm'::app_role));
CREATE POLICY turmas_adm_update ON public.turmas_app FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'adm'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'adm'::app_role));
CREATE POLICY turmas_adm_delete ON public.turmas_app FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'adm'::app_role));

CREATE TRIGGER turmas_app_updated_at BEFORE UPDATE ON public.turmas_app FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.turmas_app (turma, horario, idade, dias, ordem) VALUES
  ('1', '08:30 às 10:30', '04 a 12 anos', 'Segunda a sexta', 1),
  ('2', '15:45 às 17:45', '07 a 14 anos', 'Segunda a sexta', 2),
  ('3', '17:45 às 18:45', '04 a 07 anos', 'Segunda a quinta', 3),
  ('4', '18:45 às 19:45', '08 a 14 anos', 'Segunda a quinta', 4);