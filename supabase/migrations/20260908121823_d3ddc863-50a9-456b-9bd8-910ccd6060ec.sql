CREATE TABLE public.push_inscricoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_inscricoes TO authenticated;
GRANT ALL ON public.push_inscricoes TO service_role;
ALTER TABLE public.push_inscricoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Responsavel cuida dos seus aparelhos" ON public.push_inscricoes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);