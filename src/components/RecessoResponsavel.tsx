import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { startRegistration } from "@simplewebauthn/browser";
import { CalendarDays, Fingerprint, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { biometriaDisponivel } from "@/lib/biometria";
import { RECESSO } from "@/lib/recesso";
import { prepararRecesso, confirmarRecesso } from "@/lib/recesso.functions";
import { consultarAvisoRecesso } from "@/lib/recessoConsulta";
import { supabase } from "@/integrations/supabase/client";

export function RecessoResponsavel({ uid, enabled, onConfirmado }: { uid: string; enabled: boolean; onConfirmado: () => void }) {
  const preparar = useServerFn(prepararRecesso);
  const confirmar = useServerFn(confirmarRecesso);
  const [aberto, setAberto] = useState(false);
  const [pendente, setPendente] = useState(false);
  const [contratos, setContratos] = useState(0);
  const [leu, setLeu] = useState(false);
  const [visto, setVisto] = useState(false);
  const [concordo, setConcordo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [bio, setBio] = useState<boolean | null>(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let ativo = true;
    setErro("");
    void consultarAvisoRecesso(supabase).then((r) => { if (ativo) { setPendente(r.mostrar); setAberto(r.mostrar); setContratos(r.contratos); } }).catch((e) => { if (ativo) setErro(e instanceof Error ? e.message : "Não foi possível consultar o aviso de recesso."); });
    void biometriaDisponivel().then((r) => { if (ativo) setBio(r); });
    return () => { ativo = false; };
  }, [uid, enabled, tentativa]);

  async function aceitar() {
    if (!visto || !concordo || !leu || !bio || salvando || !contratos) return;
    setSalvando(true); setErro("");
    try {
      const inicio = await preparar();
      const resposta = await startRegistration({ optionsJSON: JSON.parse(inicio.optionsJSON) });
      const resultado = await confirmar({ data: { desafio: inicio.id, visto: true, concordo: true, resposta: { ...resposta, clientExtensionResults: { ...resposta.clientExtensionResults } } } });
      setPendente(false); setAberto(false); onConfirmado();
      toast.success(`Concordância registrada e aditivo arquivado em ${resultado.quantidade} contrato(s).`);
    } catch (e) {
      setErro(e instanceof Error && e.name !== "NotAllowedError" ? e.message : "Confirmação cancelada. O aditivo não foi registrado.");
    } finally { setSalvando(false); }
  }

  if (!enabled) return null;
  return <>
    {pendente && !aberto && <Button variant="outline" className="mt-4 w-full" onClick={() => setAberto(true)}><CalendarDays className="size-4" /> AVISO DE RECESSO — CONFIRMAÇÃO PENDENTE</Button>}
    {erro && !aberto && <div className="mt-3"><p role="alert" className="text-sm text-destructive">{erro}</p><Button variant="outline" className="mt-2" onClick={() => setTentativa((t) => t + 1)}>TENTAR NOVAMENTE</Button></div>}
    <Dialog open={aberto} onOpenChange={(value) => { if (!salvando) setAberto(value); }}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border-primary/50">
        <DialogHeader>
          <CalendarDays className="mb-2 size-8 text-primary" />
          <DialogTitle className="pr-6 font-display text-2xl">RECESSO SUPER CT</DialogTitle>
          <DialogDescription className="pt-2 text-base">Aviso prévio: as atividades regulares estarão suspensas de <strong className="text-foreground">24/12/2026 a 03/01/2027</strong>, inclusive.</DialogDescription>
        </DialogHeader>
        <Accordion type="single" collapsible onValueChange={(value) => { if (value) setLeu(true); }}>
          <AccordionItem value="clausula">
            <AccordionTrigger className="text-xs">Ler toda a cláusula de recesso</AccordionTrigger>
            <AccordionContent className="space-y-3 text-xs leading-relaxed"><h3 className="font-semibold">{RECESSO.titulo}</h3><p className="whitespace-pre-line">{RECESSO.texto}</p></AccordionContent>
          </AccordionItem>
        </Accordion>
        <label className="flex items-start gap-3 text-sm"><Checkbox checked={visto} disabled={!leu || salvando} onCheckedChange={(v) => setVisto(v === true)} /><span>Marcar como visto: li toda a cláusula.</span></label>
        <label className="flex items-start gap-3 text-sm"><Checkbox checked={concordo} disabled={!visto || salvando} onCheckedChange={(v) => setConcordo(v === true)} /><span>Estou ciente e concordo com o recesso e com a inclusão desta cláusula como aditivo ao contrato.</span></label>
        {bio === false && <p className="text-xs text-muted-foreground">Este aparelho não oferece confirmação biométrica ou bloqueio de tela compatível. Use um aparelho compatível para confirmar; nenhum aditivo será registrado sem essa verificação.</p>}
        {contratos === 0 && <p className="text-xs text-muted-foreground">Seu contrato assinado precisa estar anexado para receber o aditivo. Caso tenha sido entregue em papel, solicite à administração que anexe uma cópia.</p>}
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <Button disabled={!bio || !visto || !concordo || !contratos || salvando} onClick={() => void aceitar()} className="h-auto min-h-11 whitespace-normal py-3">{salvando ? <LoaderCircle className="size-4 animate-spin" /> : <Fingerprint className="size-5" />}{salvando ? "REGISTRANDO ADITIVO…" : "CONFIRMAR COM BIOMETRIA"}</Button>
        <Button variant="ghost" disabled={salvando} onClick={() => setAberto(false)}>CONFIRMAR DEPOIS</Button>
      </DialogContent>
    </Dialog>
  </>;
}