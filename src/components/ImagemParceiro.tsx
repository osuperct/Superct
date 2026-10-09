import { useQuery } from "@tanstack/react-query";
import { resolverImagem } from "@/lib/parceiros";

export function ImagemParceiro({ caminho, alt, className }: { caminho: string; alt: string; className?: string }) {
  const { data } = useQuery({ queryKey: ["imagem-parceiro", caminho], queryFn: () => resolverImagem(caminho), enabled: Boolean(caminho), staleTime: 30 * 60 * 1000 });
  return data ? <img src={data} alt={alt} className={className} /> : null;
}