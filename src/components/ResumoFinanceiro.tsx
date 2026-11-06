import { useMemo, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, Clock, FileDown, MessageCircle, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Mensalidade, formatarDataIso, formatarValor, hojeIso, mesExtensoRef, refMes } from "@/lib/mensalidade";
import { parcelaNoMes, type PlanoContrato } from "@/lib/planoContrato";
import { MES_INICIAL, atrasosDoAluno, linkCobranca, statusPagamento, vencimentoIso } from "@/lib/financeiro";

type Alu = { id: string; nome: string; matricula: string | null; user_id: string };

export function ResumoFinanceiro({
  alunos,
  mensalidades,
  planos,
  responsaveis,
  telefones,
}: {
  alunos: Alu[];
  mensalidades: Mensalidade[];
  planos: PlanoContrato[];
  responsaveis: Record<string, string>;
  telefones: Record<string, string>;
}) {
  const mesAtual = refMes();
  const hoje = hojeIso();
  const [aberto, setAberto] = useState<null | "atrasados" | "renovacoes">(null);
  const [mesPdf, setMesPdf] = useState(refMes(new Date(), -1));
  const planoDe = (id: string) => planos.find((p) => p.alunoId === id);

  const linhasMes = (ref: string) =>
    alunos
      .map((a) => {
        const m = mensalidades.find((x) => x.aluno_id === a.id && x.referencia === ref);
        const plano = planoDe(a.id);
        if ((m && !m.ativo) || (!m && !plano)) return null;
        const venc = vencimentoIso(ref, plano?.vencimento);
        return { a, m, venc, status: statusPagamento(m, venc, hoje), valor: Number(m?.valor ?? plano?.valor ?? 0) };
      })
      .filter((l): l is NonNullable<typeof l> => !!l);

  const doMes = useMemo(() => linhasMes(mesAtual), [alunos, mensalidades, planos]); // eslint-disable-line react-hooks/exhaustive-deps
  const recebido = doMes.filter((l) => l.status.startsWith("pago")).reduce((s, l) => s + l.valor, 0);
  const aReceber = doMes.filter((l) => l.status === "a vencer").reduce((s, l) => s + l.valor, 0);

  const atrasados = useMemo(
    () =>
      alunos
        .map((a) => ({ a, itens: atrasosDoAluno(a.id, mensalidades, planoDe(a.id), mesAtual, hoje) }))
        .filter((x) => x.itens.length > 0)
        .sort((x, y) => Math.max(...y.itens.map((i) => i.dias)) - Math.max(...x.itens.map((i) => i.dias))),
    [alunos, mensalidades, planos], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const totalAtraso = atrasados.reduce((s, x) => s + x.itens.reduce((t, i) => t + i.valor, 0), 0);

  const mesProximo = refMes(new Date(), 1);
  const renovacoes = alunos
    .map((a) => {
      const p = planoDe(a.id);
      if (!p || p.parcelas <= 1) return null;
      const at = parcelaNoMes(p, mesAtual);
      const px = parcelaNoMes(p, mesProximo);
      if (at.numero !== at.total && px.numero !== px.total) return null;
      return { a, p, quando: at.numero === at.total ? mesAtual : mesProximo };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const meses: string[] = [];
  for (let i = 0; i < 24; i++) {
    const r = refMes(new Date(), -i);
    if (r >= MES_INICIAL) meses.push(r);
  }

  async function baixarPdf() {
    const { jsPDF } = await import("jspdf");
    const linhas = linhasMes(mesPdf).sort((x, y) => x.a.nome.localeCompare(y.a.nome, "pt-BR"));
    const doc = new jsPDF();
    let y = 18;
    doc.setFontSize(16);
    doc.text(`Super CT — Fechamento de ${mesExtensoRef(mesPdf)}`, 14, y);
    y += 7;
    doc.setFontSize(9);
    doc.text(`Gerado em ${formatarDataIso(hoje)}`, 14, y);
    y += 8;
    const grupos: [string, typeof linhas][] = [
      ["PAGOS", linhas.filter((l) => l.status === "pago")],
      ["PAGOS COM ATRASO", linhas.filter((l) => l.status === "pago com atraso")],
      ["EM ATRASO", linhas.filter((l) => l.status === "em atraso")],
      ["A VENCER", linhas.filter((l) => l.status === "a vencer")],
    ];
    for (const [titulo, itens] of grupos) {
      if (itens.length === 0) continue;
      if (y > 270) { doc.addPage(); y = 18; }
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${titulo} (${itens.length}) — ${formatarValor(itens.reduce((s, l) => s + l.valor, 0))}`, 14, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      y += 6;
      for (const l of itens) {
        if (y > 282) { doc.addPage(); y = 18; }
        doc.text(l.a.nome.slice(0, 48), 14, y);
        doc.text(`vence ${formatarDataIso(l.venc)}`, 108, y);
        doc.text(l.m?.pago ? `pago ${formatarDataIso(l.m.pago_em)} ${l.m.forma ?? ""}` : "—", 138, y);
        doc.text(formatarValor(l.valor), 196, y, { align: "right" });
        y += 5;
      }
      y += 4;
    }
    const pago = linhas.filter((l) => l.status.startsWith("pago")).reduce((s, l) => s + l.valor, 0);
    const aberto = linhas.filter((l) => !l.status.startsWith("pago")).reduce((s, l) => s + l.valor, 0);
    if (y > 270) { doc.addPage(); y = 18; }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL RECEBIDO: ${formatarValor(pago)}   •   EM ABERTO: ${formatarValor(aberto)}`, 14, y + 2);
    doc.save(`fechamento-super-ct-${mesPdf.slice(0, 7)}.pdf`);
  }

  const card = "flex flex-col items-start gap-1 rounded-lg border p-3 text-left";
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg tracking-tight">RESUMO DE {mesExtensoRef(mesAtual).toUpperCase()}</h2>
      <div className="grid grid-cols-2 gap-2">
        <div className={`${card} border-primary/50 bg-primary/10`}>
          <CheckCircle2 className="size-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Recebido</span>
          <span className="font-display text-base text-primary">{formatarValor(recebido)}</span>
        </div>
        <div className={`${card} border-border bg-card/40`}>
          <Clock className="size-4 text-muted-foreground" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">A receber</span>
          <span className="font-display text-base">{formatarValor(aReceber)}</span>
        </div>
        <button type="button" onClick={() => setAberto("atrasados")} className={`${card} border-destructive/60 bg-destructive/10`}>
          <AlertTriangle className="size-4 text-destructive" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Atrasados ({atrasados.length})</span>
          <span className="font-display text-base text-destructive">{formatarValor(totalAtraso)}</span>
          <span className="text-[10px] text-muted-foreground">Toque para cobrar</span>
        </button>
        <button type="button" onClick={() => setAberto("renovacoes")} className={`${card} border-evaluation-orange/60 bg-card/40`}>
          <BellRing className="size-4 text-evaluation-orange" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Renovações</span>
          <span className="font-display text-base">{renovacoes.length}</span>
          <span className="text-[10px] text-muted-foreground">Este mês e o próximo</span>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/40 p-3">
        <FileDown className="size-4 text-primary" />
        <span className="text-xs">Fechamento do mês em PDF</span>
        <select value={mesPdf} onChange={(e) => setMesPdf(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs">
          {meses.map((m) => <option key={m} value={m}>{mesExtensoRef(m)}</option>)}
        </select>
        <button type="button" onClick={() => void baixarPdf()} className="rounded-md bg-primary px-3 py-1.5 font-display text-[10px] tracking-tight text-primary-foreground">
          BAIXAR PDF
        </button>
      </div>

      <Dialog open={aberto !== null} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent showCloseButton={false} aria-describedby={undefined} className="z-[70] flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-screen-sm flex-col gap-0 overflow-hidden rounded-lg bg-background p-0">
          <DialogHeader className="shrink-0 border-b border-border p-4 pr-14 text-left">
            <DialogTitle className="font-display text-base">
              {aberto === "atrasados" ? `ATRASADOS (${atrasados.length})` : `RENOVAÇÕES (${renovacoes.length})`}
            </DialogTitle>
          </DialogHeader>
          <DialogClose asChild>
            <button type="button" aria-label="Fechar" className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </DialogClose>
          <ul className="min-h-0 space-y-1.5 overflow-y-auto overscroll-contain p-4">
            {aberto === "atrasados" &&
              atrasados.map(({ a, itens }) => {
                const tel = telefones[a.user_id] ?? "";
                const total = itens.reduce((s, i) => s + i.valor, 0);
                const mesesTxt = itens.map((i) => mesExtensoRef(i.referencia));
                return (
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs">
                    <span className="min-w-0">
                      <span className="font-medium">{a.nome}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {responsaveis[a.user_id] || "Responsável"} • {mesesTxt.join(", ")}
                      </span>
                      <span className="block font-mono text-[10px] uppercase tracking-widest text-destructive">
                        {formatarValor(total)} • {Math.max(...itens.map((i) => i.dias))} dias de atraso
                      </span>
                    </span>
                    {tel ? (
                      <a
                        href={linkCobranca(tel, responsaveis[a.user_id] ?? "", a.nome, mesesTxt, formatarValor(total))}
                        target="_blank"
                        rel="noreferrer"
                        className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-1.5 font-display text-[10px] tracking-tight text-primary-foreground"
                      >
                        <MessageCircle className="size-3.5" /> COBRAR
                      </a>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">sem telefone</span>
                    )}
                  </li>
                );
              })}
            {aberto === "atrasados" && atrasados.length === 0 && (
              <li className="text-xs text-muted-foreground">Ninguém em atraso. 🎉</li>
            )}
            {aberto === "renovacoes" &&
              renovacoes.map((r) => (
                <li key={r.a.id} className="rounded-md border border-border px-3 py-2 text-xs">
                  <span className="font-medium">{r.a.nome}</span>
                  <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    {r.p.planoTexto} • última parcela em {mesExtensoRef(r.quando)}
                  </span>
                </li>
              ))}
            {aberto === "renovacoes" && renovacoes.length === 0 && (
              <li className="text-xs text-muted-foreground">Nenhuma renovação próxima.</li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </section>
  );
}
