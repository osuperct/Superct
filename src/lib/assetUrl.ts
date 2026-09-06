// As mídias do site ficam numa CDN externa. No domínio da Lovable o caminho
// relativo funciona, mas em qualquer outro hospedeiro (Vercel etc.) ele não
// existe — então sempre usamos o endereço absoluto da CDN.
const BASE_CDN = "https://superct.lovable.app";

type AssetPointer = { url: string };

export function assetUrl(asset: AssetPointer): string {
  if (asset.url.startsWith("http")) return asset.url;
  return BASE_CDN + asset.url;
}
