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
import { confirmarRecesso } from "@/lib/recesso.functions";
import { consultarAvisoRecesso } from "@/lib/recessoConsulta";
import { supabase } from "@/integrations/supabase/client";
import recessoNatal from "@/assets/recesso-natal-super-ct.jpg";

export function RecessoResponsavel({ uid, enabled, onConfirmado, onBloqueioChange }: { uid: string; enabled: boolean; onConfirmado: () => void; onBloqueioChange?: (bloqueado: boolean) => void }) {
  const confirmar = useServerFn(confirmarRecesso);
  const { setForcarRecolhida } = useSidebarControl();
  const [consulta, setConsulta] = useState<{ uid: string; estado: EstadoAvisoRecesso } | null>(null);
  const [contratos, setContratos] = useState(0);
  const [aceitou, setAceitou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [bio, setBio] = useState<boolean | null>(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [preparo, setPreparo] = useState<{ id: string; challenge: string; rpId: string; em: number } | null>(null);
  const [tentativaPreparo, setTentativaPreparo] = useState(0);
  // Embedded windows (like the editor preview) can be denied WebAuthn by the parent page's permissions policy.
  const [janelaBloqueada, setJanelaBloqueada] = useState(false);
  useEffect(() => {
    let embutida = true;
    try { embutida = window.top !== window.self; } catch { embutida = true; }
    const politica = (document as Document & { featurePolicy?: { allowsFeature: (f: string) => boolean } }).featurePolicy;
    setJanelaBloqueada(embutida && politica ? !politica.allowsFeature("publickey-credentials-create") : false);
  }, []);

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

  // Android Chrome only opens the biometric prompt when it starts right after the tap.
  // Fetch the challenge as soon as the terms are accepted, so OK calls it without waiting on the network.
  useEffect(() => {
    if (!aceitou || bio !== true || contratos === 0) { setPreparo(null); return; }
    let ativo = true;
    const buscar = () => {
      void supabase.rpc("recesso_iniciar", { _origin: window.location.origin }).then(({ data, error }) => {
        if (!ativo) return;
        const linha = Array.isArray(data) ? data[0] : null;
        if (error || !linha) { console.error("recesso_iniciar", error?.message); setErro("Não foi possível preparar a biometria. Desmarque e marque novamente “Li e aceito os termos”."); setPreparo(null); return; }
        setPreparo({ id: linha.id, challenge: linha.challenge, rpId: linha.rp_id, em: Date.now() });
      });
    };
    buscar();
    const timer = window.setInterval(buscar, 4 * 60 * 1000);
    return () => { ativo = false; window.clearInterval(timer); };
  }, [aceitou, bio, contratos, tentativaPreparo]);

  async function aceitar() {
    if (!recessoPodeConfirmar(aceitou, bio, contratos, salvando)) return;
    if (!preparo || Date.now() - preparo.em > 4.5 * 60 * 1000) { setTentativaPreparo((t) => t + 1); setErro("Preparando a biometria… toque em OK novamente em instantes."); return; }
    if (preparo.rpId !== window.location.hostname) { setErro("Não foi possível abrir a biometria neste endereço. Recarregue a página e tente novamente."); return; }
    setSalvando(true); setErro("");
    const atual = preparo;
    try {
      const resposta = await startRegistration({ optionsJSON: {
        challenge: atual.challenge,
        rp: { id: atual.rpId, name: "Super CT — Recesso" },
        user: { id: btoa(uid.slice(0, 48)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), name: uid, displayName: "Responsável Super CT" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60000, attestation: "none",
      } });
      setPreparo(null);
      const resultado = await confirmar({ data: { desafio: atual.id, visto: true, concordo: true, resposta: { ...resposta, clientExtensionResults: { ...resposta.clientExtensionResults } } } });
      setConsulta({ uid, estado: "liberado" }); onConfirmado();
      toast.success(`Concordância registrada e aditivo arquivado em ${resultado.quantidade} contrato(s).`);
    } catch (e) {
      console.error("Biometria do recesso", e instanceof Error ? `${e.name}: ${e.message}` : e);
      setPreparo(null); setTentativaPreparo((t) => t + 1);
      setErro(e instanceof Error && e.name === "NotAllowedError" ? "A biometria foi cancelada ou não abriu. Toque em OK novamente e confirme com sua digital, rosto ou senha do celular. Nenhum aditivo foi registrado." : e instanceof Error && e.message ? e.message : "Não foi possível confirmar. Toque em OK novamente.");
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
          <DialogTitle className="pr-6 font-display text-2xl">Aviso prévio sobre o <span className="text-evaluation-orange">recesso de fim de ano do Super CT</span></DialogTitle>
          <DialogDescription className="pt-2 text-base">Aviso prévio de recesso de Natal: as atividades regulares estarão suspensas nos dias <strong className="text-foreground">24, 28, 29, 30 e 31 de dezembro de 2026</strong>.</DialogDescription>
        </DialogHeader>
        {estado === "consultando" ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Consultando aviso de recesso…</p> : estado === "erro" ? <div><p role="alert" className="text-sm text-destructive">{erro}</p><Button variant="outline" className="mt-2" onClick={() => setTentativa((t) => t + 1)}>TENTAR NOVAMENTE</Button></div> : <>
        <Accordion type="single" collapsible>
          <AccordionItem value="clausula">
            <AccordionTrigger className="text-xs">Ler toda a cláusula de recesso</AccordionTrigger>
            <AccordionContent className="space-y-3 text-xs leading-relaxed"><h3 className="font-semibold">{RECESSO.titulo}</h3><p className="whitespace-pre-line">{RECESSO.texto}</p></AccordionContent>
          </AccordionItem>
        </Accordion>
        <label className="flex items-start gap-3 text-sm"><Checkbox checked={aceitou} disabled={salvando} onCheckedChange={(v) => setAceitou(v === true)} /><span>Li e aceito os termos</span></label>
        {janelaBloqueada && <div role="note" className="space-y-2 rounded-md border border-primary/50 p-3 text-sm"><p>Nesta janela de prévia o celular não deixa abrir a biometria. Abra o app em uma aba própria do navegador para confirmar.</p><Button type="button" variant="outline" className="w-full" onClick={() => window.open(window.location.href, "_blank", "noopener")}>ABRIR EM NOVA ABA</Button></div>}
        {bio === false && <p className="text-xs text-muted-foreground">Este aparelho não oferece confirmação biométrica ou bloqueio de tela compatível. Use um aparelho compatível para confirmar; nenhum aditivo será registrado sem essa verificação.</p>}
        {contratos === 0 && <p className="text-xs text-muted-foreground">Seu contrato assinado precisa estar anexado para receber o aditivo. Caso tenha sido entregue em papel, solicite à administração que anexe uma cópia.</p>}
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <Button disabled={!recessoPodeConfirmar(aceitou, bio, contratos, salvando) || !preparo || janelaBloqueada} onClick={() => void aceitar()} className="h-auto min-h-11 whitespace-normal py-3">{salvando || (aceitou && !preparo && bio === true && contratos > 0) ? <LoaderCircle className="size-4 animate-spin" /> : <Fingerprint className="size-5" />}{salvando ? "REGISTRANDO ADITIVO…" : aceitou && !preparo && bio === true && contratos > 0 ? "PREPARANDO BIOMETRIA…" : "OK"}</Button>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}