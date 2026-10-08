import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
            { nome: "Dany Baby Kids", imagem: dany },
            { nome: "Musicativar", imagem: assetUrl(musicativar) },
            { nome: "Thassia Tamaso", imagem: thassia },
          ].map((parceiro) => (
            <img key={parceiro.nome} src={parceiro.imagem} alt={`Logo ${parceiro.nome}`} className="mx-auto aspect-square w-full max-w-56 object-contain" />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}