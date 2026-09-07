DELETE FROM public.tokens_push t USING public.tokens_push t2 WHERE t.token = t2.token AND t.ctid > t2.ctid;
ALTER TABLE public.tokens_push ADD CONSTRAINT tokens_push_token_key UNIQUE (token);