CREATE TABLE public.push_aparelhos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sid TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_aparelhos TO authenticated;
GRANT ALL ON public.push_aparelhos TO service_role;
ALTER TABLE public.push_aparelhos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aparelhos proprios" ON public.push_aparelhos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);