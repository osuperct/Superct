import { DatePicker } from "@/components/ui/datepicker";
import { useMemo, useState } from "react";
import { CircleDollarSign, TrendingUp } from "lucide-react";
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

type Alu = { id: string; nome: string; matricula: string | null; user_id: string };

const VALORES = [185, 160, 150, 135];

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

export function Mensalidades({
  alunos,
  mensalidades,
  recarregar,
}: {
  alunos: Alu[];
  mensalidades: Mensalidade[];
  recarregar: () => void;
}) {
  const [salvando, setSalvando] = useState<string | null>(null);
  const mesAtual = refMes();
  const mesProximo = refMes(new Date(), 1);

  const ordenados = useMemo(
    () => [...alunos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [alunos],
  );

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

  const projecao = ativosMes.map((a) => ({ aluno: a, valor: Number(doMes(a.id)?.valor ?? 0) }));
  const totalProjecao = projecao.reduce((s, p) => s + p.valor, 0);

  return (
    <>
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

        <ul className="mt-3 space-y-2">
          {ordenados.map((a) => {
            const m = doMes(a.id);
            const ativo = m?.ativo ?? true;
            return (
              <li key={a.id} className="rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{a.nome}</p>
                  <span className="shrink-0 rounded border border-primary/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                    {a.matricula ?? "—"}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
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

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void salvar(a, {
                        pago: !(m?.pago ?? false),
                        pago_em: m?.pago ? null : hojeIso(),
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
                  {m?.pago && (
                    <>
                      <div className="w-40">
                        <DatePicker
                          value={m.pago_em ? new Date(`${m.pago_em}T12:00:00`) : undefined}
                          placeholder="Dia do pagamento"
                          onChange={(d) => {
                            if (!d) return;
                            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                            void salvar(a, { pago_em: iso });
                          }}
                        />
                      </div>
                      <select
                        value={m.forma ?? FORMAS[0]!}
                        onChange={(e) => void salvar(a, { forma: e.target.value })}
                        className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                      >
                        {FORMAS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  {salvando === a.id && (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      salvando…
                    </span>
                  )}
                </div>

                {m?.pago && (
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-primary">
                    Recebido em {formatarDataIso(m.pago_em)} • {m.forma ?? "—"} • {formatarValor(m.valor)}
                  </p>
                )}
              </li>
            );
          })}
          {ordenados.length === 0 && (
            <li className="text-sm text-muted-foreground">Nenhum aluno matriculado ainda.</li>
          )}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-card/40 p-4">
        <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
          <TrendingUp className="size-4 text-primary" /> PROJEÇÃO — {mesExtensoRef(mesProximo).toUpperCase()}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Alunos com matrícula ativa e valor previsto a receber.
        </p>
        <ul className="mt-3 space-y-1.5">
          {projecao.map((p) => (
            <li
              key={p.aluno.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-xs"
            >
              <span>{p.aluno.nome}</span>
              <span className="font-mono text-[10px] tracking-widest text-primary">
                {formatarValor(p.valor)}
              </span>
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
