CREATE TABLE public.ranking_jogo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  apelido text NOT NULL,
  pontos integer NOT NULL DEFAULT 0,
  fase integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ranking_jogo TO anon;
GRANT SELECT, INSERT, UPDATE ON public.ranking_jogo TO authenticated;
GRANT ALL ON public.ranking_jogo TO service_role;

ALTER TABLE public.ranking_jogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ranking_publico_leitura" ON public.ranking_jogo
  FOR SELECT USING (true);

CREATE POLICY "ranking_insert_own" ON public.ranking_jogo
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "ranking_update_own" ON public.ranking_jogo
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER ranking_jogo_updated_at BEFORE UPDATE ON public.ranking_jogo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();