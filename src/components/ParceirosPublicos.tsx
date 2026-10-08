import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";
import { assetUrl } from "@/lib/assetUrl";
import dany from "@/assets/parceiro-dany-logo-branco.jpg";
import musicativar from "@/assets/parceiro-musicativar-logo.jpg.asset.json";
import thassia from "@/assets/parceiro-thassia-logo-branco.jpg";
import parceirosFundo from "@/assets/parceiros-super-ct-fundo.jpg.asset.json";

export function ParceirosPublicos({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[90] block max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg p-0">
        <DialogTitle className="sr-only">PARCEIROS DO CT</DialogTitle>
        <div className="relative aspect-[720/630] overflow-hidden">
          <img src={assetUrl(parceirosFundo)} alt="Parceiros do Super CT — Conheça nossos parceiros especiais" className="absolute left-0 top-0 h-auto w-full" />
        </div>
        <div className="relative isolate overflow-hidden px-6 pb-6 pt-2">
          <img src={assetUrl(parceirosFundo)} alt="" aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[210%] w-full max-w-none object-fill" />
          <DialogDescription className="mb-5 rounded-md bg-background/90 p-3 text-center text-foreground">Descontos e benefícios exclusivos para alunos com matrícula ativa do nosso CT!</DialogDescription>
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
          {[
            { nome: "Dany Baby Kids", imagem: dany, instagram: "https://www.instagram.com/dany.babykids_?mdxt=MTQxZm5hNXhnODlhMQ==" },
            { nome: "Musicativar", imagem: assetUrl(musicativar), instagram: "https://www.instagram.com/musicativar?mdxt=YW8xeG5nM2h2eXky" },
            { nome: "Thassia Tamaso", imagem: thassia, instagram: "https://www.instagram.com/nutrithassiatamaso?rpxt=ZjFmNmM0dXlyOWVi" },
          ].map((parceiro) => (
            <div key={parceiro.nome} className="flex min-w-0 flex-col items-center gap-1">
              <img src={parceiro.imagem} alt={`Logo ${parceiro.nome}`} className={`mx-auto w-full max-w-56 object-contain ${parceiro.nome === "Musicativar" ? "h-auto" : "aspect-square"}`} />
              <Button asChild variant="outline" className="h-16 w-full max-w-56 gap-2 whitespace-normal border-primary/50 bg-background/95 px-3 py-2 text-primary hover:bg-background hover:text-primary [&_svg]:size-8 [&_svg]:shrink-0">
                <a href={parceiro.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Acesse nosso perfil! Instagram de ${parceiro.nome}`} title={`Instagram de ${parceiro.nome}`}><Instagram /><span className="text-left text-sm font-semibold">Acesse nosso perfil!</span></a>
              </Button>
            </div>
          ))}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}