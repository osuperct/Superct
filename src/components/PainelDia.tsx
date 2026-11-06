import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, FileWarning, MessageCircle, Receipt, RefreshCw, ShoppingBag, UserPlus, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BUCKET = "documentos-alunos";

type Perfil = { id: string; nome_responsavel: string | null; telefone: string | null; aprovado: boolean | null; bloqueado_em: string | null; documentos_fisicos: boolean | null };
type Comprovante = { id: string; user_id: string; aluno_id: string | null; caminho: string; nome_arquivo: string; created_at: string };
type Pendente = { perfil: Perfil; falta: string[] };

export function linkWhats(telefone: string | null | undefined, texto: string) {
  let num = String(telefone ?? "").replace(/\D+/g, "");
  if (num.length === 10 || num.length === 11) num = `55${num}`;
  else if (num.length === 8 || num.length === 9) num = `5535${num}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

function hojeIsoLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PainelDia() {
  const [cadastros, setCadastros] = useState(0);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [renovacoes, setRenovacoes] = useState(0);
  const [pedidos, setPedidos] = useState(0);
  const [comprovantes, setComprovantes] = useState<Comprovante[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [perfis, setPerfis] = useState<Record<string, Perfil>>({});
  const [aberto, setAberto] = useState<"docs" | "comp" | null>(null);
  const [mesComp, setMesComp] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    const [{ data: p }, { data: f }, { data: d }, { data: r }, { data: ped }, { data: al }] = await Promise.all([
      supabase.from("perfis").select("id, nome_responsavel, telefone, aprovado, bloqueado_em, documentos_fisicos"),
      supabase.from("fichas").select("user_id, tipo"),
      supabase.from("documentos").select("id, user_id, aluno_id, tipo, caminho, nome_arquivo, created_at, pagamento_conferido_em"),
      supabase.from("renovacoes_contrato").select("id").eq("status", "pendente"),
      supabase.from("pedidos_loja").select("id, status"),
      supabase.from("alunos").select("id, nome"),
    ]);
    const lista = (p ?? []) as Perfil[];
    const ids = new Set((await supabase.from("user_roles").select("user_id")).data?.map((x) => x.user_id) ?? []);
    setPerfis(Object.fromEntries(lista.map((x) => [x.id, x])));
    setCadastros(lista.filter((x) => !x.aprovado && !x.bloqueado_em && !ids.has(x.id)).length);
    const entregues = [...(f ?? []), ...(d ?? [])] as { user_id: string; tipo: string }[];
    setPendentes(
      lista
        .filter((x) => x.aprovado && !x.bloqueado_em && !x.documentos_fisicos && !ids.has(x.id))
        .map((x) => {
          const tipos = new Set(entregues.filter((e) => e.user_id === x.id).map((e) => e.tipo));
          const falta = [!tipos.has("contrato") && "Contrato", !tipos.has("ficha") && "PAR-Q"].filter(Boolean) as string[];
          return { perfil: x, falta };
        })
        .filter((x) => x.falta.length > 0),
    );
    setRenovacoes((r ?? []).length);
    setPedidos((ped ?? []).filter((x) => x.status !== "entregue").length);
    setComprovantes(
      ((d ?? []) as (Comprovante & { tipo: string; pagamento_conferido_em: string | null })[]).filter(
        (x) => x.tipo === "comprovante" && !x.pagamento_conferido_em,
      ),
    );
    setNomes(Object.fromEntries((al ?? []).map((a) => [a.id, a.nome])));
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function verArquivo(caminho: string) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
    else toast.error("Não foi possível abrir o arquivo.");
  }

  async function confirmar(c: Comprovante, marcarPago: boolean): Promise<void> {
    if (marcarPago) {
      if (!c.aluno_id) { toast.error("Comprovante sem aluno."); return; }
      const ref = `${mesComp[c.id] ?? c.created_at.slice(0, 7)}-01`;
      const { data: atual } = await supabase.from("mensalidades").select("id").eq("aluno_id", c.aluno_id).eq("referencia", ref).maybeSingle();
      const pagoEm = c.created_at.slice(0, 10);
      const { error } = atual
        ? await supabase.from("mensalidades").update({ pago: true, pago_em: pagoEm, forma: "Pix" }).eq("id", atual.id)
        : await supabase.from("mensalidades").insert({ aluno_id: c.aluno_id, user_id: c.user_id, referencia: ref, pago: true, pago_em: pagoEm, forma: "Pix" });
      if (error) { toast.error("Não foi possível marcar como pago."); return; }
    }
    const { error } = await supabase.from("documentos").update({ pagamento_conferido_em: new Date().toISOString() }).eq("id", c.id);
    if (error) { toast.error("Não foi possível concluir."); return; }
    toast.success(marcarPago ? "Mensalidade marcada como paga!" : "Comprovante arquivado.");
    void carregar();
  }

  const cartao = "flex flex-col items-start gap-1 rounded-md border p-3 text-left";
  const ativo = (n: number) => (n > 0 ? "border-primary/60 bg-primary/5" : "border-border bg-background/40");

  return (
    <section className="rounded-lg border-2 border-primary/50 bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <CalendarCheck className="size-4 text-primary" /> PAINEL DO DIA
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">O que precisa da sua atenção hoje ({hojeIsoLocal().split("-").reverse().join("/")}).</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <a href="#aprovacoes" className={`${cartao} ${ativo(cadastros)}`}>
          <UserPlus className="size-4 text-primary" /><span className="font-display text-2xl">{cadastros}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Cadastros p/ aprovar</span>
        </a>
        <button type="button" onClick={() => setAberto("docs")} className={`${cartao} ${ativo(pendentes.length)}`}>
          <FileWarning className="size-4 text-primary" /><span className="font-display text-2xl">{pendentes.length}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Documentos faltando</span>
        </button>
        <button type="button" onClick={() => setAberto("comp")} className={`${cartao} ${ativo(comprovantes.length)}`}>
          <Receipt className="size-4 text-primary" /><span className="font-display text-2xl">{comprovantes.length}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Comprovantes Pix</span>
        </button>
        <Link to="/financeiro" className={`${cartao} border-border bg-background/40`}>
          <Wallet className="size-4 text-primary" /><span className="font-display text-sm">VER</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Pagamentos atrasados</span>
        </Link>
        <Link to="/financeiro" className={`${cartao} ${ativo(renovacoes)}`}>
          <RefreshCw className="size-4 text-primary" /><span className="font-display text-2xl">{renovacoes}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Renovações pendentes</span>
        </Link>
        <a href="#pedidos" className={`${cartao} ${ativo(pedidos)}`}>
          <ShoppingBag className="size-4 text-primary" /><span className="font-display text-2xl">{pedidos}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Pedidos da lojinha</span>
        </a>
      </div>

      <Dialog open={aberto === "docs"} onOpenChange={(v) => setAberto(v ? "docs" : null)}>
        <DialogContent showCloseButton={false} aria-describedby={undefined} className="z-[70] flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-screen-sm flex-col gap-0 overflow-hidden rounded-lg bg-background p-0">
          <DialogHeader className="shrink-0 border-b border-border p-4 pr-14 text-left">
            <DialogTitle className="flex items-center gap-2 font-display text-base leading-snug">
              <FileWarning className="size-4 shrink-0 text-primary" /> DOCUMENTOS FALTANDO
            </DialogTitle>
          </DialogHeader>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Fechar documentos faltando"
              className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </DialogClose>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          {pendentes.length === 0 && <p className="text-sm text-muted-foreground">Todos entregaram contrato e PAR-Q. 🎉</p>}
          <ul className="space-y-2">
            {pendentes.map(({ perfil, falta }) => (
              <li key={perfil.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm">{perfil.nome_responsavel || "Responsável sem nome"}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-accent-red">Falta: {falta.join(" e ")}</p>
                </div>
                {perfil.telefone && (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={linkWhats(perfil.telefone, `Olá${perfil.nome_responsavel ? `, ${perfil.nome_responsavel.split(" ")[0]}` : ""}! Aqui é do Super CT 💪 Falta preencher ${falta.join(" e ")} no app. É rapidinho: entre em osuperct.com, na sua conta, e toque no aviso de documentos. Obrigado!`)}
                    className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-2 font-display text-xs text-primary-foreground"
                  >
                    <MessageCircle className="size-3" /> COBRAR
                  </a>
                )}
              </li>
            ))}
          </ul>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={aberto === "comp"} onOpenChange={(v) => setAberto(v ? "comp" : null)}>
        <DialogContent showCloseButton={false} aria-describedby={undefined} className="z-[70] flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-screen-sm flex-col gap-0 overflow-hidden rounded-lg bg-background p-0">
          <DialogHeader className="shrink-0 border-b border-border p-4 pr-14 text-left">
            <DialogTitle className="flex items-center gap-2 font-display text-base leading-snug">
              <Receipt className="size-4 shrink-0 text-primary" /> COMPROVANTES PIX
            </DialogTitle>
          </DialogHeader>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Fechar comprovantes Pix"
              className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </DialogClose>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          {comprovantes.length === 0 && <p className="text-sm text-muted-foreground">Nenhum comprovante novo.</p>}
          <ul className="space-y-2">
            {comprovantes.map((c) => (
              <li key={c.id} className="space-y-2 rounded-md border border-border p-3">
                <p className="text-sm">{(c.aluno_id && nomes[c.aluno_id]) || "Aluno"}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {perfis[c.user_id]?.nome_responsavel ?? ""} • enviado {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </p>
                <label className="flex items-center gap-2 text-xs">
                  Mês pago:
                  <input type="month" value={mesComp[c.id] ?? c.created_at.slice(0, 7)} onChange={(e) => setMesComp({ ...mesComp, [c.id]: e.target.value })} className="rounded-md border border-border bg-background px-2 py-1" />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void verArquivo(c.caminho)} className="rounded-md border border-border px-3 py-2 font-mono text-[10px] uppercase">Ver</button>
                  <button type="button" onClick={() => void confirmar(c, true)} className="rounded-md bg-primary px-3 py-2 font-display text-xs text-primary-foreground">MARCAR PAGO</button>
                  <button type="button" onClick={() => void confirmar(c, false)} className="rounded-md border border-border px-3 py-2 font-mono text-[10px] uppercase text-muted-foreground">Só arquivar</button>
                </div>
              </li>
            ))}
          </ul>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
