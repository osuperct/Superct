import { Button } from "@/components/ui/button";
import { Instagram } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { parceirosQuery, linkSeguro, whatsappParceiro } from "@/lib/parceiros";
import { ImagemParceiro } from "@/components/ImagemParceiro";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.91 11.91 0 0 0 12.04 0C5.44 0 .07 5.37.07 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.96 11.96 0 0 0 5.83 1.49h.01C18.64 23.86 24 18.49 24 11.89c0-3.19-1.24-6.18-3.48-8.41ZM12.04 21.84h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.68.97.98-3.59-.24-.37a9.88 9.88 0 0 1-1.52-5.29c0-5.49 4.46-9.95 9.95-9.95a9.88 9.88 0 0 1 7.04 2.92 9.89 9.89 0 0 1 2.91 7.04c0 5.49-4.46 9.86-10.02 9.86Zm5.46-7.45c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51h-.58c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.11 3.22 5.11 4.52.71.31 1.27.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.77-.73 2.02-1.44.25-.7.25-1.3.18-1.43-.08-.12-.28-.2-.58-.35Z" />
    </svg>
  );
}

export function ParceirosResponsavel() {
  const { data, isPending, isError, refetch } = useQuery(parceirosQuery(true));
  if (isPending) return <p className="text-sm text-muted-foreground">Carregando parcerias…</p>;
  if (isError) return <Button variant="outline" onClick={() => void refetch()}>Tentar novamente</Button>;
  return (
      <div className="space-y-6">
        <h2 className="font-display text-xl">{data.config.titulo}</h2>
        <ImagemParceiro caminho={data.config.banner_responsavel} alt="Parceiros do Super CT — Conheça nossos parceiros especiais" className="mx-auto h-auto w-full max-w-sm" />
        <div className="grid items-stretch gap-6 md:grid-cols-2">
          {data.parceiros.map((publico) => {
            const beneficio = data.beneficios.find((b) => b.id === publico.id);
            if (!beneficio) return null;
            const parceiro = { ...publico, ...beneficio };
            return (
            <article key={parceiro.id} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
              <ImagemParceiro caminho={parceiro.imagem_url} alt={`Parceria Super CT + ${parceiro.nome}`} className="aspect-[4/5] w-full object-contain" />
              {linkSeguro(parceiro.instagram) && <Button asChild variant="outline" className="mx-auto mt-1 h-16 w-[calc(100%-2rem)] max-w-56 gap-2 whitespace-normal border-primary/50 px-3 py-2 text-primary hover:bg-primary/10 hover:text-primary [&_svg]:size-8 [&_svg]:shrink-0">
                <a href={parceiro.instagram} target="_blank" rel="noopener noreferrer" aria-label={`Acesse nosso perfil! Instagram de ${parceiro.nome}`} title={`Instagram de ${parceiro.nome}`}><Instagram /><span className="text-left text-sm font-semibold">Acesse nosso perfil!</span></a>
              </Button>}
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs text-muted-foreground">{parceiro.categoria}</p>
                <h2 className="mt-1 font-display text-2xl">{parceiro.nome}</h2>
                {parceiro.descricao && <p className="mt-2 text-sm text-muted-foreground">{parceiro.descricao}</p>}
                {parceiro.desconto && <p className="mt-5 font-display text-3xl text-primary">{parceiro.desconto} DE DESCONTO</p>}
                <p className="mt-2 text-sm leading-relaxed">{parceiro.beneficio}</p>
                {parceiro.cupom && <p className="mt-3 text-sm">Cupom: <strong className="font-mono text-secondary">{parceiro.cupom}</strong></p>}
                <p className="mb-5 mt-3 text-xs text-muted-foreground">{parceiro.condicoes}</p>
                {parceiro.telefone && <Button asChild variant="outline" className="mt-auto w-full border-whatsapp/40 text-whatsapp hover:text-whatsapp">
                  <a href={whatsappParceiro(parceiro.telefone)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${parceiro.nome}: ${parceiro.telefone}`} title={`Falar com ${parceiro.nome} no WhatsApp`}>
                    <WhatsAppIcon /> {parceiro.telefone}
                  </a>
                </Button>}
              </div>
            </article>
          ); })}
        </div>
      </div>
  );
}