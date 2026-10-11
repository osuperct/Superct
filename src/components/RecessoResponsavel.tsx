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
import { RECESSO, recessoBloqueiaAcesso, recessoPodeConfirmar, type EstadoAvisoRecesso } from "@/lib/recesso";
import { useSidebarControl } from "@/components/SidebarContext";
import { prepararRecesso, confirmarRecesso } from "@/lib/recesso.functions";
import { consultarAvisoRecesso } from "@/lib/recessoConsulta";
import { supabase } from "@/integrations/supabase/client";
import recessoNatal from "@/assets/recesso-natal-super-ct.jpg";

export function RecessoResponsavel({ uid, enabled, onConfirmado, onBloqueioChange }: { uid: string; enabled: boolean; onConfirmado: () => void; onBloqueioChange?: (bloqueado: boolean) => void }) {
  const preparar = useServerFn(prepararRecesso);
  const confirmar = useServerFn(confirmarRecesso);
  const { setForcarRecolhida } = useSidebarControl();
  const [consulta, setConsulta] = useState<{ uid: string; estado: EstadoAvisoRecesso } | null>(null);
  const [contratos, setContratos] = useState(0);
  const [aceitou, setAceitou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [bio, setBio] = useState<boolean | null>(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let ativo = true;
    setErro("");
    setConsulta({ uid, estado: "consultando" });
    setAceitou(false);
    void consultarAvisoRecesso(supabase).then((r) => { if (ativo) { setConsulta({ uid, estado: r.mostrar ? "pendente" : "liberado" }); setContratos(r.contratos); } }).catch((e) => { if (ativo) { setConsulta({ uid, estado: "erro" }); setErro(e instanceof Error ? e.message : "Não foi possível consultar o aviso de recesso."); } });
    void biometriaDisponivel().then((r) => { if (ativo) setBio(r); });
    return () => { ativo = false; };
  }, [uid, enabled, tentativa]);

  async function aceitar() {
    if (!recessoPodeConfirmar(aceitou, bio, contratos, salvando)) return;
    setSalvando(true); setErro("");
    try {
      const inicio = await preparar({ data: { origin: window.location.origin } });
      const optionsJSON = JSON.parse(inicio.optionsJSON);
      if (optionsJSON.rp?.id !== window.location.hostname) throw new Error("Não foi possível abrir a biometria neste endereço. Recarregue a página e tente novamente.");
      const resposta = await startRegistration({ optionsJSON });
      const resultado = await confirmar({ data: { desafio: inicio.id, visto: true, concordo: true, resposta: { ...resposta, clientExtensionResults: { ...resposta.clientExtensionResults } } } });
      setConsulta({ uid, estado: "liberado" }); onConfirmado();
      toast.success(`Concordância registrada e aditivo arquivado em ${resultado.quantidade} contrato(s).`);
    } catch (e) {
      setErro(e instanceof Error && e.name !== "NotAllowedError" ? e.message : "O navegador não concluiu a confirmação do aparelho. Se a biometria não abriu, acesse sua conta diretamente no Chrome, fora da janela de prévia, e tente novamente. Nenhum aditivo foi registrado.");
    } finally { setSalvando(false); }
  }

  const estado = consulta?.uid === uid ? consulta.estado : "consultando";
  const acessoBloqueado = recessoBloqueiaAcesso(enabled, estado);
  useEffect(() => {
    onBloqueioChange?.(acessoBloqueado);
  }, [acessoBloqueado, onBloqueioChange]);
  useEffect(() => {
    setForcarRecolhida(acessoBloqueado);
    return () => setForcarRecolhida(false);
  }, [acessoBloqueado, setForcarRecolhida]);

  if (!enabled) return null;
  return <>
    <Dialog open={acessoBloqueado}>
      <DialogContent showCloseButton={false} onEscapeKeyDown={(event) => event.preventDefault()} onInteractOutside={(event) => event.preventDefault()} className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border-primary/50">
        <img src={recessoNatal} alt="Personagens do Super CT com camisetas do uniforme e gorros de Papai Noel, ao lado de uma árvore de Natal e presentes" className="aspect-[2/1] w-full rounded-md object-cover" />
        <DialogHeader>
          <CalendarDays className="mb-2 size-8 text-primary" />
          <DialogTitle className="pr-6 font-display text-2xl">RECESSO SUPER CT</DialogTitle>
          <DialogDescription className="pt-2 text-base">Aviso prévio de recesso de Natal: as atividades regulares estarão suspensas de <strong className="text-foreground">24/12/2026 a 03/01/2027</strong>.</DialogDescription>
        </DialogHeader>
        {estado === "consultando" ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Consultando aviso de recesso…</p> : estado === "erro" ? <div><p role="alert" className="text-sm text-destructive">{erro}</p><Button variant="outline" className="mt-2" onClick={() => setTentativa((t) => t + 1)}>TENTAR NOVAMENTE</Button></div> : <>
        <Accordion type="single" collapsible>
          <AccordionItem value="clausula">
            <AccordionTrigger className="text-xs">Ler toda a cláusula de recesso</AccordionTrigger>
            <AccordionContent className="space-y-3 text-xs leading-relaxed"><h3 className="font-semibold">{RECESSO.titulo}</h3><p className="whitespace-pre-line">{RECESSO.texto}</p></AccordionContent>
          </AccordionItem>
        </Accordion>
        <label className="flex items-start gap-3 text-sm"><Checkbox checked={aceitou} disabled={salvando} onCheckedChange={(v) => setAceitou(v === true)} /><span>Li e aceito os termos</span></label>
        {bio === false && <p className="text-xs text-muted-foreground">Este aparelho não oferece confirmação biométrica ou bloqueio de tela compatível. Use um aparelho compatível para confirmar; nenhum aditivo será registrado sem essa verificação.</p>}
        {contratos === 0 && <p className="text-xs text-muted-foreground">Seu contrato assinado precisa estar anexado para receber o aditivo. Caso tenha sido entregue em papel, solicite à administração que anexe uma cópia.</p>}
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <Button disabled={!recessoPodeConfirmar(aceitou, bio, contratos, salvando)} onClick={() => void aceitar()} className="h-auto min-h-11 whitespace-normal py-3">{salvando ? <LoaderCircle className="size-4 animate-spin" /> : <Fingerprint className="size-5" />}{salvando ? "REGISTRANDO ADITIVO…" : "OK"}</Button>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}