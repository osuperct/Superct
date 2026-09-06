// As mídias do site ficam numa CDN externa. No domínio da Lovable o caminho
// relativo funciona, mas em qualquer outro hospedeiro (Vercel etc.) ele não
// existe — então sempre usamos o endereço absoluto da CDN.
// Endereço estável da CDN (não redireciona para o domínio personalizado).
const BASE_CDN = "https://project--f98de061-dc8c-43b5-9c7f-56210aba7b2d.lovable.app";

type AssetPointer = { url: string };

export function assetUrl(asset: AssetPointer): string {
  if (asset.url.startsWith("http")) return asset.url;
  return BASE_CDN + asset.url;
}
