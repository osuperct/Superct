import { useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { FileSignature, Fingerprint, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { biometriaDisponivel } from "@/lib/biometria";
import { CLAUSULAS_CONTRATO, BUCKET } from "@/lib/documentos";
import { RECESSO } from "@/lib/recesso";
import { dataBr, gerarAditivoRenovacao, textoRenovacao } from "@/lib/renovacao";
import { useSidebarControl } from "@/components/SidebarContext";
import { supabase } from "@/integrations/supabase/client";

type Renovacao = { id: string; aluno_id: string | null; plano: string; forma: string; inicio: string; fim: string; vencimento: string; valor_total: number | null; aluno: string };

export function RenovacaoResponsavel({ uid, enabled, onConfirmado }: { uid: string; enabled: boolean; onConfirmado: () => void }) {
  const { setForcarRecolhida } = useSidebarControl();
  const [renov, setRenov] = useState<Renovacao | null>(null);
  const [aceitou, setAceitou] = useState(false);
  const [bio, setBio] = useState<boolean | null>(null);
  const [preparo, setPreparo] = useState<{ id: string; challenge: string; rpId: string; em: number } | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!enabled) { setRenov(null); return; }
    let ativo = true;
    void (async () => {
      const { data } = await supabase.from("renovacoes_contrato").select("id, aluno_id, plano, forma, inicio, fim, vencimento, valor_total").eq("user_id", uid).eq("status", "pendente").order("created_at").limit(1);
      const r = data?.[0];
      if (!ativo || !r) { if (ativo) setRenov(null); return; }
      let aluno = "";
      if (r.aluno_id) { const { data: a } = await supabase.from("alunos").select("nome").eq("id", r.aluno_id).maybeSingle(); aluno = a?.nome ?? ""; }
      if (ativo) setRenov({ ...r, valor_total: r.valor_total === null ? null : Number(r.valor_total), aluno });
    })();
    void biometriaDisponivel().then((b) => { if (ativo) setBio(b); });
    return () => { ativo = false; };
  }, [uid, enabled]);

  useEffect(() => {
    if (!aceitou || bio !== true || !renov) { setPreparo(null); return; }
    let ativo = true;
    const buscar = () => {
      void supabase.rpc("renovacao_iniciar", { _origin: window.location.origin, _renovacao: renov.id }).then(({ data, error }) => {
        if (!ativo) return;
        const linha = Array.isArray(data) ? data[0] : null;
        if (error || !linha) { setErro("Não foi possível preparar a biometria. Desmarque e marque novamente."); setPreparo(null); return; }
        setPreparo({ id: linha.id, challenge: linha.challenge, rpId: linha.rp_id, em: Date.now() });
      });
    };
    buscar();
    const t = window.setInterval(buscar, 4 * 60 * 1000);
    return () => { ativo = false; window.clearInterval(t); };
  }, [aceitou, bio, renov, tentativa]);

  const aberto = enabled && !!renov;
  useEffect(() => { setForcarRecolhida(aberto); return () => setForcarRecolhida(false); }, [aberto, setForcarRecolhida]);

  async function confirmar() {
    if (!renov || !preparo || salvando) return;
    if (Date.now() - preparo.em > 4.5 * 60 * 1000) { setTentativa((t) => t + 1); setErro("Preparando a biometria… toque em OK novamente."); return; }
    setSalvando(true); setErro("");
    const atual = preparo;
    try {
      const resposta = await startRegistration({ optionsJSON: {
        challenge: atual.challenge,
        rp: { id: atual.rpId, name: "Super CT — Renovação" },
        user: { id: btoa(uid.slice(0, 48)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), name: uid, displayName: "Responsável Super CT" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
        timeout: 60000, attestation: "none",
      } });
      setPreparo(null);
      const { data: u } = await supabase.auth.getUser();
      const { data: perfil } = await supabase.from("perfis").select("nome_responsavel").eq("id", uid).maybeSingle();
      const { data: docs } = await supabase.from("documentos").select("caminho, nome_arquivo, aluno_id, created_at").eq("user_id", uid).eq("tipo", "contrato").order("created_at", { ascending: false });
      const doc = (docs ?? []).find((d) => !renov.aluno_id || !d.aluno_id || d.aluno_id === renov.aluno_id);
      let bytes: ArrayBuffer; let tipo = "application/pdf";
      if (doc) {
        const { data: arq, error } = await supabase.storage.from(BUCKET).download(doc.caminho);
        if (error || !arq) throw new Error("Não foi possível abrir o contrato. Tente novamente.");
        bytes = await arq.arrayBuffer();
        tipo = /\.png$/i.test(doc.nome_arquivo) ? "image/png" : /\.jpe?g$/i.test(doc.nome_arquivo) ? "image/jpeg" : "application/pdf";
      } else {
        bytes = await (await import("pdf-lib")).PDFDocument.create().then((p) => p.save()).then((b) => b.buffer as ArrayBuffer);
      }
      const pdf = await gerarAditivoRenovacao(bytes, tipo, renov, { aluno: renov.aluno, nome: perfil?.nome_responsavel ?? "", email: u.user?.email ?? "", data: new Date().toISOString(), credencial: atual.id });
      const nome = `contrato-renovacao-${renov.inicio}.pdf`;
      const caminho = `${uid}/renovacao/${atual.id}-${nome}`;
      const { error: eu } = await supabase.storage.from(BUCKET).upload(caminho, pdf, { contentType: "application/pdf" });
      if (eu) throw new Error("Não foi possível arquivar a renovação. Tente novamente.");
      const { error } = await supabase.rpc("renovacao_registrar", { _desafio: atual.id, _credencial: JSON.stringify(resposta), _agente: navigator.userAgent.slice(0, 500), _caminho: caminho, _nome_arquivo: nome, _hash: Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(pdf))), (b) => b.toString(16).padStart(2, "0")).join("") });
      if (error) { await supabase.storage.from(BUCKET).remove([caminho]); throw new Error("Não foi possível registrar a renovação. Toque em OK e tente outra vez."); }
      setRenov(null); onConfirmado();
      toast.success("Renovação confirmada! O contrato atualizado já está nos documentos do aluno.");
    } catch (e) {
      setPreparo(null); setTentativa((t) => t + 1);
      setErro(e instanceof Error && e.name === "NotAllowedError" ? "A biometria foi cancelada ou não abriu. Toque em OK novamente." : e instanceof Error && e.message ? e.message : "Não foi possível confirmar. Toque em OK novamente.");
    } finally { setSalvando(false); }
  }

  if (!aberto || !renov) return null;
  return (
    <Dialog open>
      <DialogContent showCloseButton={false} onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border-primary/50">
        <DialogHeader>
          <FileSignature className="mb-2 size-8 text-primary" />
          <DialogTitle className="font-display text-2xl">Renovação do <span className="text-evaluation-orange">contrato do Super CT</span></DialogTitle>
          <DialogDescription>Confira as condições do novo plano{renov.aluno ? ` de ${renov.aluno}` : ""} e confirme com a biometria.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 rounded-md border border-border bg-card/60 p-3 text-sm">
          <p><strong>Plano:</strong> {renov.plano}</p>
          {renov.valor_total ? <p><strong>Valor total:</strong> R$ {renov.valor_total.toFixed(2).replace(".", ",")}</p> : null}
          <p><strong>Pagamento:</strong> {renov.forma}</p>
          <p><strong>Vigência:</strong> {dataBr(renov.inicio)} a {dataBr(renov.fim)}</p>
          <p><strong>Vencimento:</strong> todo dia {renov.vencimento}</p>
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="c">
            <AccordionTrigger className="text-xs">Ler o termo e todas as cláusulas atualizadas</AccordionTrigger>
            <AccordionContent className="space-y-3 text-xs leading-relaxed">
              <p className="whitespace-pre-line">{textoRenovacao(renov, renov.aluno)}</p>
              {[...CLAUSULAS_CONTRATO, RECESSO].map((c) => <div key={c.titulo}><h3 className="font-semibold">{c.titulo}</h3><p className="whitespace-pre-line">{c.texto}</p></div>)}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <label className="flex items-start gap-3 text-sm"><Checkbox checked={aceitou} disabled={salvando} onCheckedChange={(v) => setAceitou(v === true)} /><span>Li e aceito os termos da renovação</span></label>
        {bio === false && <p className="text-xs text-muted-foreground">Este aparelho não oferece biometria ou bloqueio de tela compatível. Use um aparelho compatível para confirmar.</p>}
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <Button disabled={!aceitou || bio !== true || !preparo || salvando} onClick={() => void confirmar()} className="h-auto min-h-11 py-3">
          {salvando || (aceitou && bio === true && !preparo) ? <LoaderCircle className="size-4 animate-spin" /> : <Fingerprint className="size-5" />}
          {salvando ? "REGISTRANDO RENOVAÇÃO…" : aceitou && bio === true && !preparo ? "PREPARANDO BIOMETRIA…" : "OK"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
