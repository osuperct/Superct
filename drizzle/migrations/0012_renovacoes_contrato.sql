CREATE TABLE public.renovacoes_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE CASCADE,
  ficha_id uuid NOT NULL REFERENCES public.fichas(id) ON DELETE CASCADE,
  plano text NOT NULL,
  forma text NOT NULL,
  inicio date NOT NULL,
  fim date NOT NULL,
  vencimento text NOT NULL,
  valor_total numeric,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aceita','cancelada')),
  aceita_em timestamptz,
  documento_id uuid,
  assinatura_id uuid,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renovacoes_contrato TO authenticated;
GRANT ALL ON public.renovacoes_contrato TO service_role;
ALTER TABLE public.renovacoes_contrato ENABLE ROW LEVEL SECURITY;
CREATE POLICY renov_owner_select ON public.renovacoes_contrato FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'adm'));
CREATE POLICY renov_adm_insert ON public.renovacoes_contrato FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'adm') AND status = 'pendente');
CREATE POLICY renov_adm_update ON public.renovacoes_contrato FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'adm')) WITH CHECK (public.has_role(auth.uid(),'adm'));
CREATE POLICY renov_adm_delete ON public.renovacoes_contrato FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'adm') AND status <> 'aceita');

CREATE OR REPLACE FUNCTION public.renovacao_iniciar(_origin text, _renovacao uuid)
RETURNS TABLE(id uuid, challenge text, rp_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); host text; ch text; novo uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = uid AND p.aprovado AND p.bloqueado_em IS NULL) THEN RAISE EXCEPTION 'Acesso não liberado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.renovacoes_contrato r WHERE r.id = _renovacao AND r.user_id = uid AND r.status = 'pendente') THEN RAISE EXCEPTION 'Renovação não encontrada'; END IF;
  IF NOT (_origin IN ('https://osuperct.com','https://www.osuperct.com','https://superct.lovable.app','https://f98de061-dc8c-43b5-9c7f-56210aba7b2d.lovableproject.com','https://id-preview--f98de061-dc8c-43b5-9c7f-56210aba7b2d.lovable.app')
          OR _origin ~ '^https?://localhost(:[0-9]{1,5})?$') THEN
    RAISE EXCEPTION 'Endereço não autorizado';
  END IF;
  host := regexp_replace(regexp_replace(_origin, '^https?://', ''), ':[0-9]+$', '');
  ch := rtrim(translate(encode(decode(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''), 'hex'), 'base64'), '+/', '-_'), '=');
  INSERT INTO public.recesso_desafios(user_id, challenge, origin, rp_id, versao)
  VALUES (uid, ch, _origin, host, 'renovacao:' || _renovacao::text) RETURNING recesso_desafios.id INTO novo;
  RETURN QUERY SELECT novo, ch, host;
END $$;

CREATE OR REPLACE FUNCTION public.renovacao_registrar(_desafio uuid, _credencial text, _agente text, _caminho text, _nome_arquivo text, _hash text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); d public.recesso_desafios; r public.renovacoes_contrato; cred jsonb; s text; cd jsonb; mail text; nome text; assinatura uuid; doc uuid; v_valor numeric; ip text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
  SELECT p.nome_responsavel INTO nome FROM public.perfis p WHERE p.id = uid AND p.aprovado AND p.bloqueado_em IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Acesso não liberado'; END IF;
  SELECT * INTO d FROM public.recesso_desafios WHERE recesso_desafios.id = _desafio AND user_id = uid FOR UPDATE;
  IF NOT FOUND OR d.usado_em IS NOT NULL OR d.created_at < now() - interval '5 minutes' OR d.versao NOT LIKE 'renovacao:%' THEN RAISE EXCEPTION 'Confirmação expirada'; END IF;
  SELECT * INTO r FROM public.renovacoes_contrato WHERE renovacoes_contrato.id = substring(d.versao from 11)::uuid AND user_id = uid AND status = 'pendente' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Renovação não encontrada'; END IF;
  cred := _credencial::jsonb;
  s := translate(cred->'response'->>'clientDataJSON', '-_', '+/');
  s := s || repeat('=', (4 - length(s) % 4) % 4);
  cd := convert_from(decode(s, 'base64'), 'UTF8')::jsonb;
  IF cd->>'type' <> 'webauthn.create' OR cd->>'challenge' <> d.challenge OR cd->>'origin' <> d.origin THEN
    RAISE EXCEPTION 'Confirmação do aparelho não corresponde';
  END IF;
  IF _caminho NOT LIKE uid::text || '/renovacao/' || _desafio::text || '-%' THEN RAISE EXCEPTION 'Arquivo inválido'; END IF;
  SELECT u.email INTO mail FROM auth.users u WHERE u.id = uid;
  BEGIN ip := split_part(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', ',', 1); EXCEPTION WHEN others THEN ip := NULL; END;
  INSERT INTO public.assinaturas_eletronicas(user_id,tipo,email,nome_assinante,ip,user_agent,login_verificado,biometria,biometria_credencial,hash_documento,caminho)
  VALUES(uid,'renovacao',coalesce(mail,''),coalesce(nome,''),left(coalesce(nullif(ip,''),'não identificado'),100),left(coalesce(_agente,''),500),true,true,_credencial,left(_hash,200),_caminho) RETURNING id INTO assinatura;
  INSERT INTO public.documentos(user_id,aluno_id,tipo,nome_arquivo,caminho,enviado_por_professor,liberado,liberado_em,oculto_responsavel)
  VALUES(uid,r.aluno_id,'contrato',left(_nome_arquivo,200),_caminho,true,true,now(),false) RETURNING id INTO doc;
  UPDATE public.fichas SET dados = dados || jsonb_build_object('valor', r.plano, 'forma_pagamento', r.forma, 'data_inicio', to_char(r.inicio,'DD/MM/YYYY'), 'data_fim', to_char(r.fim,'DD/MM/YYYY'), 'vencimento', r.vencimento)
  WHERE id = r.ficha_id AND tipo = 'contrato';
  v_valor := public.valor_do_plano(r.plano);
  IF r.aluno_id IS NOT NULL THEN
    UPDATE public.mensalidades SET valor = coalesce(v_valor, valor), forma = r.forma
    WHERE aluno_id = r.aluno_id AND NOT pago AND referencia >= date_trunc('month', r.inicio)::date;
  END IF;
  UPDATE public.renovacoes_contrato SET status='aceita', aceita_em=now(), documento_id=doc, assinatura_id=assinatura WHERE id = r.id;
  UPDATE public.recesso_desafios SET usado_em=now() WHERE id=_desafio;
END $$;
REVOKE ALL ON FUNCTION public.renovacao_iniciar(text, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.renovacao_registrar(uuid, text, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.renovacao_iniciar(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.renovacao_registrar(uuid, text, text, text, text, text) TO authenticated;