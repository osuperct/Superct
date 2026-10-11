CREATE OR REPLACE FUNCTION public.recesso_iniciar(_origin text)
RETURNS TABLE(id uuid, challenge text, rp_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); host text; ch text; novo uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.perfis p WHERE p.id = uid AND p.aprovado AND p.bloqueado_em IS NULL) THEN RAISE EXCEPTION 'Acesso não liberado'; END IF;
  IF NOT (_origin IN ('https://osuperct.com','https://www.osuperct.com','https://superct.lovable.app','https://f98de061-dc8c-43b5-9c7f-56210aba7b2d.lovableproject.com','https://id-preview--f98de061-dc8c-43b5-9c7f-56210aba7b2d.lovable.app')
          OR _origin ~ '^https?://localhost(:[0-9]{1,5})?$') THEN
    RAISE EXCEPTION 'Endereço não autorizado para confirmar o recesso';
  END IF;
  host := regexp_replace(regexp_replace(_origin, '^https?://', ''), ':[0-9]+$', '');
  ch := rtrim(translate(encode(decode(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''), 'hex'), 'base64'), '+/', '-_'), '=');
  INSERT INTO public.recesso_desafios(user_id, challenge, origin, rp_id, versao)
  VALUES (uid, ch, _origin, host, 'recesso-2026-2027-v1') RETURNING recesso_desafios.id INTO novo;
  RETURN QUERY SELECT novo, ch, host;
END $$;

CREATE OR REPLACE FUNCTION public.recesso_registrar(_desafio uuid, _credencial text, _ip text, _agente text, _arquivos jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid(); d public.recesso_desafios; cred jsonb; s text; cd jsonb; item jsonb; mail text; nome text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
  SELECT p.nome_responsavel INTO nome FROM public.perfis p WHERE p.id = uid AND p.aprovado AND p.bloqueado_em IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Acesso não liberado'; END IF;
  SELECT * INTO d FROM public.recesso_desafios WHERE recesso_desafios.id = _desafio AND user_id = uid;
  IF NOT FOUND OR d.usado_em IS NOT NULL OR d.created_at < now() - interval '5 minutes' THEN RAISE EXCEPTION 'Confirmação expirada'; END IF;
  cred := _credencial::jsonb;
  s := translate(cred->'response'->>'clientDataJSON', '-_', '+/');
  s := s || repeat('=', (4 - length(s) % 4) % 4);
  cd := convert_from(decode(s, 'base64'), 'UTF8')::jsonb;
  IF cd->>'type' <> 'webauthn.create' OR cd->>'challenge' <> d.challenge OR cd->>'origin' <> d.origin THEN
    RAISE EXCEPTION 'Confirmação do aparelho não corresponde';
  END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(_arquivos) LOOP
    IF (item->>'caminho') NOT LIKE uid::text || '/recesso/' || _desafio::text || '-%' THEN RAISE EXCEPTION 'Arquivo inválido'; END IF;
  END LOOP;
  SELECT u.email INTO mail FROM auth.users u WHERE u.id = uid;
  PERFORM public.recesso_arquivar(_desafio, uid, _credencial, left(coalesce(_ip,''),100), left(coalesce(_agente,''),500), coalesce(mail,''), coalesce(nome,''), _arquivos);
END $$;

REVOKE ALL ON FUNCTION public.recesso_iniciar(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recesso_registrar(uuid, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recesso_iniciar(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recesso_registrar(uuid, text, text, text, jsonb) TO authenticated;

GRANT SELECT ON public.recesso_desafios TO authenticated;
DROP POLICY IF EXISTS recesso_desafios_own_read ON public.recesso_desafios;
CREATE POLICY recesso_desafios_own_read ON public.recesso_desafios FOR SELECT TO authenticated USING (user_id = auth.uid());