CREATE POLICY "produtos_fotos_leitura_publica"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'produtos'
  AND EXISTS (
    SELECT 1
    FROM public.produtos p
    WHERE p.imagem_url = storage.objects.name
      AND p.ativo = true
  )
);