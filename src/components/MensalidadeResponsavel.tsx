import { useEffect, useState } from "react";
import { CircleDollarSign, Copy, CreditCard, QrCode } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatarDataIso, formatarValor, hojeIso, mesExtensoRef, refMes, type Mensalidade } from "@/lib/mensalidade";
import { normalizarForma } from "@/lib/planoContrato";
import { PIX_CHAVE, PIX_CHAVE_EXIBICAO } from "@/lib/pix";

/** Links de pagamento por cartão (InfinitePay) conforme o valor da mensalidade. */
const LINKS_CARTAO: Record<number, string> = {
  120: "https://checkout.infinitepay.io/super_ct/SqorqgV3fs",
  135: "https://checkout.infinitepay.io/super_ct/Ttp4RL6jMX",
  140: "https://checkout.infinitepay.io/super_ct/TkUZfnEtG2",
  150: "https://checkout.infinitepay.io/super_ct/k4h5ASLivL",
  160: "https://checkout.infinitepay.io/super_ct/T0V5ffiPYL",
  185: "https://checkout.infinitepay.io/super_ct/nOxMYWvpqa",
};

function linkCartao(valor: number | null) {
  if (!valor) return null;
  return LINKS_CARTAO[Math.round(valor)] ?? null;
}

function DialogPagamento({ mensalidade, onFechar }: { mensalidade: Mensalidade; onFechar: () => void }) {
  const link = linkCartao(mensalidade.valor);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/70" />
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl">
        <h3 className="font-display text-lg tracking-tight">PAGAR MENSALIDADE</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {mesExtensoRef(mensalidade.referencia)} · {formatarValor(mensalidade.valor)}
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-border p-3">
            <p className="flex items-center gap-2 font-display text-sm">
              <QrCode className="size-4 text-primary" /> PIX
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Chave (telefone):</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded border border-border bg-muted/40 px-2 py-1.5 font-mono text-sm">
                {PIX_CHAVE_EXIBICAO}
              </code>
              <button
                onClick={() => {
                  void navigator.clipboard
                    .writeText(PIX_CHAVE.replace("+55", ""))
                    .then(() => toast.success("Chave Pix copiada!"))
                    .catch(() => toast.error("Não foi possível copiar."));
                }}
                className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 font-display text-xs text-primary-foreground"
              >
                <Copy className="size-3.5" /> COPIAR
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Valor: {formatarValor(mensalidade.valor)} · Envie o comprovante pelo WhatsApp.
            </p>
          </div>

          <div className="rounded-md border border-border p-3">
            <p className="flex items-center gap-2 font-display text-sm">
              <CreditCard className="size-4 text-primary" /> CARTÃO
            </p>
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block rounded-md bg-primary px-3 py-2 text-center font-display text-xs text-primary-foreground"
              >
                PAGAR {formatarValor(mensalidade.valor)} NO CARTÃO
              </a>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Link de cartão não disponível para este valor. Fale com o professor pelo WhatsApp.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onFechar}
          className="mt-4 w-full rounded-md border border-border py-2 font-display text-xs text-muted-foreground"
        >
          FECHAR
        </button>
      </div>
    </div>
  );
}

type AlunoSimples = { id: string; nome: string; matricula: string | null };
type Contrato = { vencimento: string; forma: string; plano: string };

/** Dia de vencimento (1–31) lido do contrato; padrão dia 10. */
function diaVencimento(texto: string) {
  const n = Number((texto.match(/\d{1,2}/) ?? [])[0]);
  return n >= 1 && n <= 31 ? n : 10;
}

function dataVencimento(referencia: string, dia: number) {
  const [ano, mes] = referencia.split("-").map(Number);
  const ultimo = new Date(ano!, mes!, 0).getDate();
  return `${ano}-${String(mes).padStart(2, "0")}-${String(Math.min(dia, ultimo)).padStart(2, "0")}`;
}

function situacao(m: Mensalidade, venc: string) {
  if (m.pago) return { texto: "EM DIA", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" };
  if (hojeIso() > venc) return { texto: "EM ATRASO", cls: "bg-destructive/15 text-destructive border-destructive/40" };
  return { texto: "A VENCER", cls: "bg-primary/15 text-primary border-primary/40" };
}

export function MensalidadeResponsavel({
  uid,
  alunos,
  compacto = false,
  onAtraso,
}: {
  uid: string;
  alunos: AlunoSimples[];
  compacto?: boolean;
  onAtraso?: (atrasada: boolean) => void;
}) {
  const [mens, setMens] = useState<Mensalidade[]>([]);
  const [contratos, setContratos] = useState<Record<string, Contrato>>({});
  const [aba, setAba] = useState<"atual" | "pagas">("atual");
  const [pagando, setPagando] = useState<Mensalidade | null>(null);

  useEffect(() => {
    void (async () => {
      const [{ data: m }, { data: f }] = await Promise.all([
        supabase
          .from("mensalidades")
          .select("id, aluno_id, user_id, referencia, ativo, valor, pago, pago_em, forma")
          .eq("user_id", uid)
          .order("referencia", { ascending: false }),
        supabase
          .from("fichas")
          .select("aluno_id, dados, created_at")
          .eq("user_id", uid)
          .eq("tipo", "contrato")
          .order("created_at", { ascending: false }),
      ]);
      setMens((m ?? []) as Mensalidade[]);
      const c: Record<string, Contrato> = {};
      for (const ficha of f ?? []) {
        if (!ficha.aluno_id || c[ficha.aluno_id]) continue;
        const d = (ficha.dados ?? {}) as Record<string, unknown>;
        c[ficha.aluno_id] = {
          vencimento: String(d["vencimento"] ?? ""),
          forma: String(d["forma_pagamento"] ?? ""),
          plano: String(d["valor"] ?? ""),
        };
      }
      setContratos(c);
    })();
  }, [uid]);

  if (alunos.length === 0) return null;
  const mesAtual = refMes();
  const temAtraso = alunos.some((al) => {
    const dia = diaVencimento(contratos[al.id]?.vencimento ?? "");
    return mens.some(
      (m) => m.aluno_id === al.id && !m.pago && m.ativo && hojeIso() > dataVencimento(m.referencia, dia),
    );
  });

  useEffect(() => {
    onAtraso?.(temAtraso);
  }, [onAtraso, temAtraso]);

  return (
    <section className={compacto ? "pb-4" : "mt-4 rounded-lg border border-border bg-card/40 p-4"}>
      {!compacto && <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <CircleDollarSign className="size-5 text-primary" /> MENSALIDADE
      </h2>}
      <div className="mt-3 flex gap-2">
        {(["atual", "pagas"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`rounded-md px-3 py-1.5 font-display text-xs tracking-tight ${
              aba === a ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
            }`}
          >
            {a === "atual" ? "SITUAÇÃO ATUAL" : "HISTÓRICO (PAGAS)"}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {alunos.map((al) => {
          const c = contratos[al.id];
          const dia = diaVencimento(c?.vencimento ?? "");
          const doAluno = mens.filter((m) => m.aluno_id === al.id);
          const ultima = doAluno[0];
          const ativa = Boolean(al.matricula) || doAluno.some((m) => m.ativo && m.referencia >= mesAtual);
          const forma = ultima?.forma || (c?.forma ? normalizarForma(c.forma) : "Não informado");

          if (aba === "pagas") {
            const pagas = doAluno.filter((m) => m.pago);
            return (
              <div key={al.id} className="rounded-md border border-border p-3">
                <p className="font-display text-sm">{al.nome}</p>
                {pagas.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Nenhuma mensalidade paga registrada ainda.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-border text-xs">
                    {pagas.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span>{mesExtensoRef(m.referencia)}</span>
                        <span className="text-muted-foreground">
                          {formatarValor(m.valor)} · {m.forma || "—"} · pago em {formatarDataIso(m.pago_em)}
                        </span>
                        <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                          EM DIA
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }

          const pendentes = doAluno.filter((m) => !m.pago && m.ativo).sort((a, b) => a.referencia.localeCompare(b.referencia));
          const atual = pendentes[0] ?? doAluno.find((m) => m.referencia === mesAtual);
          const venc = atual ? dataVencimento(atual.referencia, dia) : dataVencimento(mesAtual, dia);
          const sit = atual ? situacao(atual, venc) : null;
          return (
            <div key={al.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display">{al.nome}</p>
                <span
                  className={`rounded border px-2 py-0.5 font-mono text-[10px] ${
                    ativa ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" : "border-border text-muted-foreground"
                  }`}
                >
                  MATRÍCULA {ativa ? "ATIVA" : "INATIVA"}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Vencimento</dt>
                  <dd>Todo dia {dia} · próximo {formatarDataIso(venc)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Forma de pagamento</dt>
                  <dd>{forma}</dd>
                </div>
                {atual && (
                  <div>
                    <dt className="text-muted-foreground">{mesExtensoRef(atual.referencia)}</dt>
                    <dd>{formatarValor(atual.valor)}</dd>
                  </div>
                )}
                {sit && (
                  <div>
                    <dt className="text-muted-foreground">Situação</dt>
                    <dd>
                      <span className={`rounded border px-2 py-0.5 font-mono text-[10px] ${sit.cls} ${sit.texto === "EM ATRASO" ? "animate-urgent-blink motion-reduce:animate-none" : ""}`}>
                        {sit.texto}{sit.texto === "EM ATRASO" ? " !" : ""}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
              {atual && !atual.pago && (
                <button
                  onClick={() => setPagando(atual)}
                  className={`mt-3 w-full rounded-md bg-primary py-2 font-display text-xs text-primary-foreground ${sit?.texto === "EM ATRASO" ? "animate-urgent-blink motion-reduce:animate-none" : ""}`}
                >
                  PAGAR {formatarValor(atual.valor)}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {pagando && <DialogPagamento mensalidade={pagando} onFechar={() => setPagando(null)} />}
    </section>
  );
}
