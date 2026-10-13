import { useCallback, useEffect, useState } from "react";
import { BellRing, ChevronRight, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listarContratos, type ContratoAdm } from "@/lib/adm";
import { CAMPOS_CONTRATO } from "@/lib/documentos";
import { DIAS_AVISO_RENOVACAO, dataBr, diasAte, fimDoContrato, mesesDoPlano, somarMeses } from "@/lib/renovacao";
import { lerPlano } from "@/lib/planoContrato";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const PLANOS = CAMPOS_CONTRATO.find((c) => c.chave === "valor")?.opcoes ?? [];
const FORMAS = ["Cartão", "Pix", "Dinheiro", "Cartão Recorrente (link)"];

/** Planos semestral/anual: cartão de crédito com o valor total dividido em 6x ou 12x. */
function formaParcelada(planoTexto: string): string | null {
  const meses = mesesDoPlano(planoTexto);
  if (!meses) return null;
  const { valor } = lerPlano(planoTexto);
  if (!valor) return `Cartão de crédito parcelado em ${meses}x`;
  return `Cartão de crédito parcelado em ${meses}x de R$ ${valor.toFixed(2).replace(".", ",")}`;
}

type Item = ContratoAdm & { fim: string; dias: number; pendente: boolean };

export function RenovacoesAdm() {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState("");
  const [form, setForm] = useState({ plano: "", forma: "Cartão", inicio: "", vencimento: "" });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [contratos, { data: pend }] = await Promise.all([
        listarContratos(),
        supabase.from("renovacoes_contrato").select("ficha_id").eq("status", "pendente"),
      ]);
      const pendentes = new Set((pend ?? []).map((p) => p.ficha_id));
      const lista: Item[] = [];
      for (const c of contratos) {
        if (!mesesDoPlano(String(c.dados["valor"] ?? ""))) continue;
        const fim = fimDoContrato(c.dados);
        if (!fim) continue;
        lista.push({ ...c, fim, dias: diasAte(fim), pendente: pendentes.has(c.id) });
      }
      setItens(lista.sort((a, b) => a.dias - b.dias));
    } catch { setItens([]); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const aVencer = (itens ?? []).filter((i) => i.dias <= DIAS_AVISO_RENOVACAO && !i.pendente);

  function abrir(i: Item) {
    if (editando === i.id) { setEditando(""); return; }
    const hoje = new Date();
    const inicio = i.dias < 0 ? hoje.toISOString().slice(0, 10) : i.fim;
    const planoAtual = String(i.dados["valor"] ?? "");
    setForm({ plano: planoAtual, forma: formaParcelada(planoAtual) ?? (String(i.dados["forma_pagamento"] ?? "") || "Cartão"), inicio, vencimento: String(Number(inicio.slice(8, 10))) });
    setEditando(i.id);
  }

  async function salvar(i: Item) {
    const meses = mesesDoPlano(form.plano);
    if (!form.plano || !form.inicio || !form.vencimento) { toast.error("Preencha plano, início e vencimento."); return; }
    setSalvando(true);
    const { parcelas, valor } = lerPlano(form.plano);
    const formaFinal = formaParcelada(form.plano) ?? form.forma;
    const fim = somarMeses(form.inicio, meses ?? 1);
    // Toda renovação (semestral, anual ou mensal) exige aviso + biometria do responsável.
    const { error } = await supabase.from("renovacoes_contrato").insert({
      user_id: i.userId, aluno_id: i.alunoId, ficha_id: i.id, plano: form.plano, forma: formaFinal,
      inicio: form.inicio, fim, vencimento: form.vencimento.replace(/\D/g, ""),
      valor_total: valor ? valor * parcelas : null,
    });
    setSalvando(false);
    if (error) { toast.error("Não foi possível criar a renovação."); return; }
    toast.success("Renovação enviada! O responsável verá o aviso no próximo login para confirmar com a biometria.");
    setEditando(""); void carregar();
  }

  return (
    <Dialog open={aberto} onOpenChange={(value) => { setAberto(value); if (!value) setEditando(""); }}>
    <section className="rounded-lg border border-border bg-card/40 p-4">
      {aVencer.length > 0 && (
        <div role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-evaluation-orange/60 bg-evaluation-orange/10 p-3 text-sm">
          <BellRing className="mt-0.5 size-4 shrink-0 animate-pulse text-evaluation-orange" />
          <span>{aVencer.length} plano(s) semestral/anual vencendo em até {DIAS_AVISO_RENOVACAO} dias: {aVencer.map((i) => `${i.aluno} (${dataBr(i.fim)})`).join(", ")}.</span>
        </div>
      )}
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-auto w-full justify-between gap-2 whitespace-normal p-0 text-left hover:bg-transparent">
          <span className="flex items-center gap-2 font-display text-lg"><RefreshCw className="size-4 shrink-0 text-primary" /> RENOVAÇÃO DE PLANOS</span>
          <ChevronRight className="size-5 shrink-0 text-primary" />
        </Button>
      </DialogTrigger>
    </section>
    <DialogContent showCloseButton={false} aria-describedby={undefined} className="z-[70] flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-screen-sm flex-col gap-0 overflow-hidden rounded-lg bg-background p-0">
      <DialogHeader className="shrink-0 border-b border-border p-4 pr-14 text-left">
        <DialogTitle className="flex items-center gap-2 font-display text-lg leading-snug"><RefreshCw className="size-4 shrink-0 text-primary" /> RENOVAÇÃO DE PLANOS</DialogTitle>
      </DialogHeader>
      <DialogClose asChild>
        <Button variant="ghost" size="icon" aria-label="Fechar renovação de planos" className="absolute right-3 top-3"><X /></Button>
      </DialogClose>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
      {itens === null ? <p className="text-xs text-muted-foreground">Carregando…</p> : (
        <ul className="space-y-2">
          {itens.map((i) => (
            <li key={i.id} className={`rounded-md border p-3 ${i.dias <= DIAS_AVISO_RENOVACAO && !i.pendente ? "border-evaluation-orange/70" : "border-border"} bg-background/60`}>
              <p className="font-display text-sm tracking-tight">{i.aluno || "(aluno)"}</p>
              <p className="text-xs text-muted-foreground">Responsável: {i.responsavel || "—"} • {i.dados["valor"]}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                Termina {dataBr(i.fim)} • {i.dias < 0 ? `venceu há ${-i.dias} dia(s)` : i.dias === 0 ? "vence hoje" : `faltam ${i.dias} dia(s)`}
                {i.pendente ? " • renovação aguardando biometria" : ""}
              </p>
              {!i.pendente && (
                <Button variant="outline" size="sm" onClick={() => abrir(i)} className="mt-2 border-primary font-display text-[11px] text-primary">
                  {editando === i.id ? "FECHAR" : "RENOVAR PLANO"}
                </Button>
              )}
              {editando === i.id && (
                <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                  <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Plano de pagamento</span>
                    <select value={form.plano} onChange={(e) => setForm((f) => ({ ...f, plano: e.target.value, forma: formaParcelada(e.target.value) ?? f.forma }))} className="w-full rounded-md border border-border bg-card/60 px-3 py-2">
                      {[...new Set([...PLANOS, form.plano].filter(Boolean))].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select></label>
                  <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Forma de pagamento</span>
                    <select value={form.forma} onChange={(e) => setForm((f) => ({ ...f, forma: e.target.value }))} className="w-full rounded-md border border-border bg-card/60 px-3 py-2">
                      {[...new Set([...FORMAS, form.forma])].map((p) => <option key={p}>{p}</option>)}
                    </select></label>
                  <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Início do novo período</span>
                    <input type="date" value={form.inicio} onChange={(e) => setForm((f) => ({ ...f, inicio: e.target.value }))} className="w-full rounded-md border border-border bg-card/60 px-3 py-2" /></label>
                  <label className="block space-y-1"><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Dia do vencimento</span>
                    <input inputMode="numeric" value={form.vencimento} onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))} className="w-full rounded-md border border-border bg-card/60 px-3 py-2" /></label>
                  <Button disabled={salvando} onClick={() => void salvar(i)} className="h-auto w-full whitespace-normal py-2 font-display text-xs">
                    {salvando ? "ENVIANDO…" : "ENVIAR RENOVAÇÃO PARA O RESPONSÁVEL"}
                  </Button>
                </div>
              )}
            </li>
          ))}
          {itens.length === 0 && <li className="text-xs text-muted-foreground">Nenhum plano semestral ou anual encontrado.</li>}
        </ul>
      )}
      </div>
    </DialogContent>
    </Dialog>
  );
}
