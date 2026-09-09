import { DatePicker } from "@/components/ui/datepicker";
import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, ChevronDown, ChevronUp, CircleDollarSign, CreditCard, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  FORMAS,
  type Mensalidade,
  formatarDataIso,
  formatarValor,
  hojeIso,
  mesExtensoRef,
  refMes,
} from "@/lib/mensalidade";
import {
  diffMeses,
  parcelaNoMes,
  refSomando,
  vencimentoNoMes,
  type FormaContrato,
  type PlanoContrato,
} from "@/lib/planoContrato";

type Alu = { id: string; nome: string; matricula: string | null; user_id: string };

const VALORES = [185, 160, 150, 140, 135];

function CampoValor({
  valor,
  onChange,
}: {
  valor: number | null;
  onChange: (valor: number | null) => void;
}) {
  const preset = valor !== null && VALORES.includes(Number(valor));
  const [manual, setManual] = useState(valor !== null && !preset);

  return (
    <>
      <select
        value={manual ? "outro" : preset ? String(Number(valor)) : ""}
        onChange={(e) => {
          if (e.target.value === "outro") {
            setManual(true);
            return;
          }
          setManual(false);
          onChange(e.target.value === "" ? null : Number(e.target.value));
        }}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
      >
        <option value="">Mensalidade…</option>
        {VALORES.map((v) => (
          <option key={v} value={String(v)}>
            {formatarValor(v)}
          </option>
        ))}
        <option value="outro">Outro valor</option>
      </select>
      {manual && (
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Valor (R$)"
          defaultValue={valor ?? ""}
          onBlur={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value);
            if (v !== valor) onChange(v);
          }}
          className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        />
      )}
    </>
  );
}

const GRUPOS: { forma: FormaContrato; rotulo: string }[] = [
  { forma: "Pix / dinheiro", rotulo: "PIX / DINHEIRO" },
  { forma: "Cartão", rotulo: "CARTÃO" },
  { forma: "Cartão Recorrente (link)", rotulo: "CARTÃO RECORRENTE (LINK)" },
  { forma: "Não informado", rotulo: "SEM FORMA INFORMADA" },
];

export function Mensalidades({
  alunos,
  mensalidades,
  planos = [],
  responsaveis = {},
  recarregar,
}: {
  alunos: Alu[];
  mensalidades: Mensalidade[];
  planos?: PlanoContrato[];
  responsaveis?: Record<string, string>;
  recarregar: () => void;
}) {
  const [salvando, setSalvando] = useState<string | null>(null);
  const mesAtual = refMes();
  const mesProximo = refMes(new Date(), 1);

  const ordenados = useMemo(
    () => [...alunos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [alunos],
  );

  const [abertos, setAbertos] = useState<Set<string>>(new Set(ordenados.map((a) => a.id)));
  const [todosAbertos, setTodosAbertos] = useState(true);
  const [listaVisivel, setListaVisivel] = useState(true);
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<"todos" | "pagos" | "atraso" | "vencer">("todos");

  const toggleAluno = (id: string) => {
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    const proximo = !listaVisivel;
    setListaVisivel(proximo);
    setTodosAbertos(proximo);
    setAbertos(
      proximo ? new Set(ordenados.map((a) => a.id)) : new Set(),
    );
  };

  const doMes = (alunoId: string, ref = mesAtual) =>
    mensalidades.find((m) => m.aluno_id === alunoId && m.referencia === ref);

  async function salvar(aluno: Alu, dados: Partial<Mensalidade>) {
    const atual = doMes(aluno.id);
    setSalvando(aluno.id);
    const { error } = await supabase.from("mensalidades").upsert(
      {
        aluno_id: aluno.id,
        user_id: aluno.user_id,
        referencia: mesAtual,
        ativo: atual?.ativo ?? true,
        valor: atual?.valor ?? null,
        pago: atual?.pago ?? false,
        pago_em: atual?.pago_em ?? null,
        forma: atual?.forma ?? null,
        ...dados,
      },
      { onConflict: "aluno_id,referencia" },
    );
    setSalvando(null);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    recarregar();
  }

  const ativosMes = ordenados.filter((a) => doMes(a.id)?.ativo ?? true);
  const recebido = ativosMes.reduce((s, a) => {
    const m = doMes(a.id);
    return s + (m?.pago ? Number(m.valor ?? 0) : 0);
  }, 0);
  const aReceber = ativosMes.reduce((s, a) => {
    const m = doMes(a.id);
    return s + (m && !m.pago ? Number(m.valor ?? 0) : m ? 0 : 0);
  }, 0);

  const atrasados = mensalidades
    .filter((m) => m.ativo && !m.pago && m.referencia < mesAtual)
    .sort((a, b) => a.referencia.localeCompare(b.referencia));

  const planoDoAluno = (alunoId: string) => planos.find((p) => p.alunoId === alunoId);

  /** Valor do mês: usa o valor lançado; se faltar, o valor do plano do contrato. */
  const valorDoMes = (alunoId: string) =>
    Number(doMes(alunoId)?.valor ?? planoDoAluno(alunoId)?.valor ?? 0);

  const diaHoje = new Date().getDate();

  /** pago | atraso (venceu e não pagou) | vencer */
  const situacaoDoAluno = (a: Alu): "pago" | "atraso" | "vencer" => {
    const m = doMes(a.id);
    if (m?.pago) return "pago";
    const temAtrasoAnterior = mensalidades.some(
      (x) => x.aluno_id === a.id && x.ativo && !x.pago && x.referencia < mesAtual,
    );
    if (temAtrasoAnterior) return "atraso";
    const dia = Number(String(planoDoAluno(a.id)?.vencimento ?? "").replace(/\D+/g, ""));
    if (dia && diaHoje > dia) return "atraso";
    return "vencer";
  };

  const termo = busca.trim().toLowerCase();
  const listaFiltrada = ordenados.filter((a) => {
    if (situacao !== "todos") {
      const s = situacaoDoAluno(a);
      if (situacao === "pagos" && s !== "pago") return false;
      if (situacao === "atraso" && s !== "atraso") return false;
      if (situacao === "vencer" && s !== "vencer") return false;
    }
    if (!termo) return true;
    const resp = (responsaveis[a.user_id] ?? "").toLowerCase();
    return a.nome.toLowerCase().includes(termo) || resp.includes(termo);
  });

  // Meses disponíveis na projeção: do próximo mês até a última parcela dos planos.
  const mesesProjecao = useMemo(() => {
    let ultimo = refSomando(mesAtual, 12);
    for (const p of planos) {
      const fim = parcelaNoMes(p, mesAtual).fim;
      if (fim && fim > ultimo) ultimo = fim;
    }
    const lista: string[] = [];
    for (let i = 1; i <= diffMeses(mesAtual, ultimo); i++) lista.push(refSomando(mesAtual, i));
    return lista;
  }, [planos, mesAtual]);

  const [mesProjecao, setMesProjecao] = useState(mesProximo);

  const projecao = ativosMes.map((a) => {
    const plano = planoDoAluno(a.id);
    const parcela = plano ? parcelaNoMes(plano, mesProjecao) : null;
    const valorPlano = plano?.valor ?? null;
    const encerrado = parcela?.encerrado ?? false;
    const valor = encerrado ? 0 : Number(valorPlano ?? doMes(a.id)?.valor ?? 0);
    return { aluno: a, valor, plano: plano ?? null, parcela, encerrado };
  });
  const totalProjecao = projecao.reduce((s, p) => s + p.valor, 0);

  /** Lança automaticamente o valor do plano (anual/semestral) no mês vigente. */
  const lancados = useRef<Set<string>>(new Set());
  useEffect(() => {
    void (async () => {
      for (const a of ordenados) {
        const plano = planos.find((p) => p.alunoId === a.id);
        if (!plano || plano.parcelas <= 1 || plano.valor === null) continue;
        const parcela = parcelaNoMes(plano, mesAtual);
        if (parcela.encerrado) continue;
        const m = mensalidades.find((x) => x.aluno_id === a.id && x.referencia === mesAtual);
        const precisa = !m || Number(m.valor ?? 0) !== plano.valor || !m.ativo;
        const chave = `${a.id}:${mesAtual}:${plano.valor}`;
        if (!precisa || lancados.current.has(chave)) continue;
        lancados.current.add(chave);
        const { error } = await supabase.from("mensalidades").upsert(
          {
            aluno_id: a.id,
            user_id: a.user_id,
            referencia: mesAtual,
            ativo: true,
            valor: plano.valor,
            pago: m?.pago ?? false,
            pago_em: m?.pago_em ?? null,
            forma: m?.forma ?? plano.forma,
          },
          { onConflict: "aluno_id,referencia" },
        );
        if (!error) recarregar();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planos, mensalidades, ordenados, mesAtual]);

  /** Planos cuja última parcela cai neste mês ou no próximo — hora de renovar. */
  const renovacoes = ordenados
    .map((a) => {
      const plano = planos.find((p) => p.alunoId === a.id);
      if (!plano || plano.parcelas <= 1) return null;
      const atual = parcelaNoMes(plano, mesAtual);
      const prox = parcelaNoMes(plano, mesProximo);
      const ultimaAgora = atual.numero === atual.total;
      const ultimaProximo = prox.numero === prox.total;
      if (!ultimaAgora && !ultimaProximo) return null;
      return { aluno: a, plano, quando: ultimaAgora ? mesAtual : mesProximo };
    })
    .filter((x): x is { aluno: Alu; plano: PlanoContrato; quando: string } => x !== null);


  return (
    <>
      {renovacoes.length > 0 && (
        <section className="rounded-lg border border-destructive/60 bg-destructive/10 p-4">
          <h2 className="flex items-center gap-2 font-display text-lg tracking-tight text-destructive">
            <BellRing className="size-4" /> RENOVAÇÃO DE CONTRATO ({renovacoes.length})
          </h2>
          <ul className="mt-2 space-y-1.5">
            {renovacoes.map((r) => (
              <li
                key={r.aluno.id}
                className="rounded-md border border-destructive/40 bg-background/40 px-3 py-2 text-xs"
              >
                <span className="font-medium">{r.aluno.nome}</span>
                <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {r.plano.planoTexto} • última parcela em {mesExtensoRef(r.quando)}
                  {r.plano.vencimento ? ` • vence ${vencimentoNoMes(r.plano.vencimento, r.quando)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <CircleDollarSign className="size-4 text-primary" /> MATRÍCULAS E MENSALIDADES
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Referência: {mesExtensoRef(mesAtual)} • {ativosMes.length} ativas de {ordenados.length}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Recebido {formatarValor(recebido)} • A receber {formatarValor(aReceber)}
        </p>

        <div className="mb-2 flex items-center justify-end">
          <button
            type="button"
            onClick={toggleTodos}
            className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
          >
            {listaVisivel ? (
              <>
                <ChevronUp className="size-3" /> RECOLHER TODOS
              </>
            ) : (
              <>
                <ChevronDown className="size-3" /> ABRIR TODOS
              </>
            )}
          </button>
        </div>

        {!listaVisivel ? (
          <p className="rounded-md border border-border bg-background/40 p-3 text-sm text-muted-foreground">
            {ordenados.length} aluno{ordenados.length === 1 ? "" : "s"} matriculado{ordenados.length === 1 ? "" : "s"}.
            Clique em <span className="text-primary">ABRIR TODOS</span> para ver a lista.
          </p>
        ) : (
          <ul className="space-y-2">
            {ordenados.map((a) => {
              const m = doMes(a.id);
              const ativo = m?.ativo ?? true;
              const expandido = abertos.has(a.id);
              return (
                <li key={a.id} className="rounded-md border border-border bg-background/40 p-3">
                  <button
                    type="button"
                    onClick={() => toggleAluno(a.id)}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <span className="flex items-center gap-2">
                      {expandido ? (
                        <ChevronUp className="size-4 text-primary" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{a.nome}</span>
                    </span>
                    <span className="shrink-0 rounded border border-primary/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                      {a.matricula ?? "—"}
                    </span>
                  </button>

                  {expandido && (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={ativo ? "ativo" : "inativo"}
                          onChange={(e) => void salvar(a, { ativo: e.target.value === "ativo" })}
                          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                        >
                          <option value="ativo">Matrícula ativa</option>
                          <option value="inativo">Matrícula inativa</option>
                        </select>
                        <CampoValor
                          valor={m?.valor ?? null}
                          onChange={(valor) => void salvar(a, { valor })}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void salvar(a, {
                              pago: !(m?.pago ?? false),
                              pago_em: m?.pago ? null : (m?.pago_em ?? hojeIso()),
                              forma: m?.pago ? null : (m?.forma ?? FORMAS[0]!),
                            })
                          }
                          className={`rounded-md px-3 py-1.5 font-display text-xs tracking-tight ${
                            m?.pago
                              ? "bg-primary text-primary-foreground"
                              : "border border-border text-muted-foreground"
                          }`}
                        >
                          {m?.pago ? "PAGO" : "NÃO RECEBIDO"}
                        </button>
                        <div className="w-40">
                          <DatePicker
                            value={m?.pago_em ? new Date(`${m.pago_em}T12:00:00`) : undefined}
                            placeholder="Dia do pagamento"
                            onChange={(d) => {
                              if (!d) return;
                              const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                              void salvar(a, { pago_em: iso });
                            }}
                          />
                        </div>
                        <select
                          value={m?.forma ?? FORMAS[0]!}
                          onChange={(e) => void salvar(a, { forma: e.target.value })}
                          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                        >
                          {FORMAS.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                        {salvando === a.id && (
                          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                            salvando…
                          </span>
                        )}
                      </div>

                      {m?.pago && (
                        <p className="font-mono text-[9px] uppercase tracking-widest text-primary">
                          Recebido em {formatarDataIso(m.pago_em)} • {m.forma ?? "—"} • {formatarValor(m.valor)}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
            {ordenados.length === 0 && (
              <li className="text-sm text-muted-foreground">Nenhum aluno matriculado ainda.</li>
            )}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <CreditCard className="size-4 text-primary" /> FORMAS DE PAGAMENTO
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Alunos ativos com contrato conferido, valor do plano e vencimento em {mesExtensoRef(mesAtual)}.
        </p>
        <div className="mt-3 space-y-3">
          {GRUPOS.map((g) => {
            const itens = ativosMes
              .map((a) => ({ aluno: a, plano: planos.find((p) => p.alunoId === a.id) }))
              .filter((i) => i.plano && i.plano.forma === g.forma);
            if (itens.length === 0) return null;
            return (
              <div key={g.forma}>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  {g.rotulo} ({itens.length})
                </h3>
                <ul className="mt-1.5 space-y-1.5">
                  {itens.map((i) => (
                    <li
                      key={i.aluno.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-xs"
                    >
                      <span>
                        {i.aluno.nome}
                        <span className="ml-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                          {i.plano!.planoTexto}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="font-mono text-[10px] tracking-widest text-primary">
                          {formatarValor(i.plano!.valor)}
                        </span>
                        <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                          vence {vencimentoNoMes(i.plano!.vencimento, mesAtual) ?? "—"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {planos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum contrato conferido ainda — libere os contratos para ver as formas de pagamento.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <TrendingUp className="size-4 text-primary" /> PROJEÇÃO — {mesExtensoRef(mesProjecao).toUpperCase()}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Alunos com matrícula ativa e valor previsto a receber.
        </p>
        <select
          value={mesProjecao}
          onChange={(e) => setMesProjecao(e.target.value)}
          className="mt-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
        >
          {mesesProjecao.map((m) => (
            <option key={m} value={m}>
              {mesExtensoRef(m)}
            </option>
          ))}
        </select>
        <ul className="mt-3 space-y-1.5">
          {projecao.map((p) => (
            <li
              key={p.aluno.id}
              className="rounded-md border border-border bg-background/40 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span>{p.aluno.nome}</span>
                <span className="font-mono text-[10px] tracking-widest text-primary">
                  {formatarValor(p.valor)}
                </span>
              </div>
              {p.plano?.planoTexto && (
                <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {p.plano.planoTexto}
                  {p.parcela?.numero
                    ? ` • parcela ${p.parcela.numero}/${p.parcela.total}`
                    : ""}
                  {p.parcela?.fim ? ` • termina em ${mesExtensoRef(p.parcela.fim)}` : ""}
                  {p.plano.vencimento
                    ? ` • vence ${vencimentoNoMes(p.plano.vencimento, mesProjecao)}`
                    : ""}
                  {p.encerrado ? " • PLANO ENCERRADO" : ""}
                </p>
              )}
            </li>
          ))}
          {projecao.length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhuma matrícula ativa no mês.</li>
          )}
        </ul>
        <p className="mt-3 border-t border-border pt-2 text-sm font-medium">
          Total previsto: <span className="text-primary">{formatarValor(totalProjecao)}</span>
        </p>

        <h3 className="mt-4 font-display text-sm tracking-tight">
          ATRASADOS ({atrasados.length})
        </h3>
        <ul className="mt-2 space-y-1.5">
          {atrasados.map((m) => {
            const alu = alunos.find((a) => a.id === m.aluno_id);
            return (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-xs"
              >
                <span>
                  {alu?.nome ?? "Aluno"} • {mesExtensoRef(m.referencia)}
                </span>
                <span className="font-mono text-[10px] tracking-widest text-destructive">
                  {formatarValor(m.valor)}
                </span>
              </li>
            );
          })}
          {atrasados.length === 0 && (
            <li className="text-xs text-muted-foreground">Nenhuma mensalidade em atraso.</li>
          )}
        </ul>
      </section>
    </>
  );
}
