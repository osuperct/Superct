import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { parceirosQuery, linkSeguro } from "@/lib/parceiros";
import { ImagemParceiro } from "@/components/ImagemParceiro";

export function ParceirosPublicos({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, isPending, isError, refetch } = useQuery({ ...parceirosQuery(), enabled: open });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[90] block max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg p-0">
        <DialogTitle className="sr-only">{data?.config.titulo ?? "PARCEIROS DO CT"}</DialogTitle>
        <div className="relative aspect-[720/630] overflow-hidden">
          <ImagemParceiro caminho={data?.config.banner_publico ?? ""} alt="Parceiros do Super CT — Conheça nossos parceiros especiais" className="absolute left-0 top-0 h-auto w-full" />
        </div>
        <div className="relative isolate overflow-hidden px-6 pb-6 pt-2">
          <ImagemParceiro caminho={data?.config.banner_publico ?? ""} alt="" className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[210%] w-full max-w-none object-fill" />
          <DialogDescription className="mb-5 rounded-md bg-background/90 p-3 text-center text-foreground">{data?.config.introducao}</DialogDescription>
        {isPending && <p className="text-center text-muted-foreground">Carregando parcerias…</p>}
        {isError && <Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>}
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
          {data?.parceiros.map((parceiro) => (
            <div key={parceiro.id} className="flex min-w-0 flex-col items-center gap-1">
              <ImagemParceiro caminho={parceiro.logo_url} alt={`Logo ${parceiro.nome}`} className={`mx-auto w-full max-w-56 object-contain ${parceiro.nome === "Musicativar" ? "h-auto" : "aspect-square"}`} />
              {linkSeguro(parceiro.instagram) && <Button asChild variant="outline" className="h-16 w-full max-w-56 gap-2 whitespace-normal border-primary/50 bg-background/95 px-3 py-2 text-primary hover:bg-background hover:text-primary [&_svg]:size-8 [&_svg]:shrink-0">
                <a href={parceiro.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Acesse nosso perfil! Instagram de ${parceiro.nome}`} title={`Instagram de ${parceiro.nome}`}><Instagram /><span className="text-left text-sm font-semibold">Acesse nosso perfil!</span></a>
              </Button>}
            </div>
          ))}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}