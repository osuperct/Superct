import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";
import { assetUrl } from "@/lib/assetUrl";
import dany from "@/assets/parceiro-dany-logo-branco.jpg";
import musicativar from "@/assets/parceiro-musicativar-logo.jpg.asset.json";
import thassia from "@/assets/parceiro-thassia-logo-branco.jpg";
import parceirosBanner from "@/assets/parceiros-super-ct.jpg.asset.json";

export function ParceirosPublicos({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[90] max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
        <DialogTitle className="font-display text-2xl text-primary">PARCEIROS DO CT</DialogTitle>
        <DialogDescription>Descontos e benefícios exclusivos para alunos com matrícula ativa do nosso CT!</DialogDescription>
        <img src={assetUrl(parceirosBanner)} alt="Parceiros do Super CT — Conheça nossos parceiros especiais" className="mx-auto h-auto w-full max-w-sm" />
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-3">
          {[
            { nome: "Dany Baby Kids", imagem: dany, instagram: "https://www.instagram.com/dany.babykids_?mdxt=MTQxZm5hNXhnODlhMQ==" },
            { nome: "Musicativar", imagem: assetUrl(musicativar), instagram: "https://www.instagram.com/musicativar?mdxt=YW8xeG5nM2h2eXky" },
            { nome: "Thassia Tamaso", imagem: thassia, instagram: "https://www.instagram.com/nutrithassiatamaso?rpxt=ZjFmNmM0dXlyOWVi" },
          ].map((parceiro) => (
            <div key={parceiro.nome} className="flex min-w-0 flex-col items-center gap-1">
              <img src={parceiro.imagem} alt={`Logo ${parceiro.nome}`} className="mx-auto aspect-square w-full max-w-56 object-contain" />
              <Button asChild variant="outline" className="h-16 w-full max-w-56 gap-2 whitespace-normal border-primary/50 px-3 py-2 text-primary hover:bg-primary/10 hover:text-primary [&_svg]:size-8 [&_svg]:shrink-0">
                <a href={parceiro.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Acesse nosso perfil! Instagram de ${parceiro.nome}`} title={`Instagram de ${parceiro.nome}`}><Instagram /><span className="text-left text-sm font-semibold">Acesse nosso perfil!</span></a>
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}