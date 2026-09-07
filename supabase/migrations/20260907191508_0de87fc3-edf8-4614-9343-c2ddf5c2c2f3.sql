CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

CREATE TABLE public.tokens_push (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  plataforma text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tokens_push TO authenticated;
GRANT ALL ON public.tokens_push TO service_role;

ALTER TABLE public.tokens_push ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia próprio token push" ON public.tokens_push
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Professor pode listar tokens para enviar recados" ON public.tokens_push
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'professor'::app_role));

CREATE TRIGGER tokens_push_updated_at
  BEFORE UPDATE ON public.tokens_push
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
