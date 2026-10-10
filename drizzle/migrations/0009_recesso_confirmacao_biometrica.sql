CREATE TABLE public.recesso_desafios (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, challenge text NOT NULL, origin text NOT NULL, rp_id text NOT NULL, versao text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), usado_em timestamptz);
GRANT ALL ON public.recesso_desafios TO service_role;
ALTER TABLE public.recesso_desafios ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.recesso_aceites (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, documento_original_id uuid NOT NULL REFERENCES public.documentos(id), documento_aditivo_id uuid NOT NULL REFERENCES public.documentos(id), versao text NOT NULL, assinatura_id uuid NOT NULL REFERENCES public.assinaturas_eletronicas(id), aceito_em timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, documento_original_id, versao));
GRANT SELECT ON public.recesso_aceites TO authenticated;
GRANT ALL ON public.recesso_aceites TO service_role;
ALTER TABLE public.recesso_aceites ENABLE ROW LEVEL SECURITY;
CREATE POLICY recesso_aceites_leitura ON public.recesso_aceites FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'adm') OR public.has_role(auth.uid(), 'professor'));
CREATE FUNCTION public.recesso_arquivar(_desafio uuid, _user_id uuid, _credencial text, _ip text, _agente text, _email text, _nome text, _arquivos jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.recesso_desafios; item jsonb; doc uuid; assinatura uuid;
BEGIN
SELECT * INTO d FROM public.recesso_desafios WHERE id=_desafio AND user_id=_user_id FOR UPDATE;
IF NOT FOUND OR d.usado_em IS NOT NULL OR d.created_at < now() - interval '5 minutes' THEN RAISE EXCEPTION 'Confirmação expirada'; END IF;
IF jsonb_array_length(_arquivos)=0 THEN RAISE EXCEPTION 'Nenhum contrato'; END IF;
FOR item IN SELECT * FROM jsonb_array_elements(_arquivos) LOOP
IF NOT EXISTS(SELECT 1 FROM public.documentos WHERE id=(item->>'original')::uuid AND user_id=_user_id AND tipo='contrato') THEN RAISE EXCEPTION 'Contrato inválido'; END IF;
INSERT INTO public.assinaturas_eletronicas(user_id,tipo,email,nome_assinante,ip,user_agent,login_verificado,biometria,biometria_credencial,hash_documento,caminho) VALUES(_user_id,'recesso',_email,_nome,_ip,_agente,true,true,_credencial,item->>'hash',item->>'caminho') RETURNING id INTO assinatura;
INSERT INTO public.documentos(user_id,aluno_id,tipo,nome_arquivo,caminho,enviado_por_professor,liberado,liberado_em,oculto_responsavel) VALUES(_user_id,NULLIF(item->>'alunoId','')::uuid,'contrato',item->>'nome',item->>'caminho',true,true,now(),false) RETURNING id INTO doc;
INSERT INTO public.recesso_aceites(user_id,documento_original_id,documento_aditivo_id,versao,assinatura_id) VALUES(_user_id,(item->>'original')::uuid,doc,d.versao,assinatura);
END LOOP;
UPDATE public.recesso_desafios SET usado_em=now() WHERE id=_desafio;
END $$;
REVOKE ALL ON FUNCTION public.recesso_arquivar(uuid,uuid,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recesso_arquivar(uuid,uuid,text,text,text,text,text,jsonb) TO service_role;