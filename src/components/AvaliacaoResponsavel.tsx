import { useEffect, useMemo, useState } from "react";
import { Calendar, ClipboardCheck, Download, Sparkles, Target, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Estrelas } from "@/components/Estrelas";
import { relatorioAvaliacao } from "@/lib/avaliacaoPdf";
import { baixarBlob } from "@/lib/relatorioPdf";
import {
  CRITERIOS,
  FAIXAS,
  type Avaliacao,
  lerNotas,
  mediaNotas,
  mesCurto,
  mesExtenso,
  metaDeNotas,
} from "@/lib/avaliacao";

type Alu = { id: string; nome: string };

export function AvaliacaoResponsavel({ uid, alunos }: { uid: string; alunos: Alu[] }) {
  const [lista, setLista] = useState<Avaliacao[]>([]);
  const [escolhida, setEscolhida] = useState<string>("");

  useEffect(() => {
    let ativo = true;
    void supabase
      .from("avaliacoes")
      .select("*")
      .eq("user_id", uid)
      .eq("publicada", true)
      .order("referencia", { ascending: false })
      .then(({ data }) => {
        if (!ativo) return;
        const items = (data ?? []) as unknown as Avaliacao[];
        setLista(items);
        setEscolhida(items[0]?.id ?? "");
      });
    return () => {
      ativo = false;
    };
  }, [uid]);

  const atual = lista.find((a) => a.id === escolhida) ?? null;
  const nomeAluno = (id: string) => alunos.find((al) => al.id === id)?.nome ?? "Aluno";

  const evolucao = useMemo(() => {
    if (!atual) return [];
    return lista
      .filter((a) => a.aluno_id === atual.aluno_id)
      .slice(0, 12)
      .reverse()
      .map((a) => ({ mes: mesCurto(a.referencia), media: mediaNotas(lerNotas(a.notas)) }));
  }, [lista, atual]);

  async function baixar() {
    if (!atual) return;
    try {
      const blob = await relatorioAvaliacao(
        nomeAluno(atual.aluno_id),
        atual,
        lista.filter((a) => a.aluno_id === atual.aluno_id),
      );
      baixarBlob(blob, `avaliacao-${atual.referencia}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    }
  }

  const notas = atual ? lerNotas(atual.notas) : {};
  const media = mediaNotas(notas);

  return (
    <section className="mt-4 rounded-lg border border-border bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <ClipboardCheck className="size-4 text-primary" /> AVALIAÇÃO DO PROFESSOR
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Avaliação mensal por estrelas, publicada todo dia 28. Apenas para visualização.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {FAIXAS.map((f) => (
          <span key={f.rotulo} className={`font-mono text-[9px] uppercase tracking-widest ${f.classe}`}>
            {f.rotulo}: {f.ate === 3 ? "1 a 3" : f.ate === 6 ? "4 a 6" : "7 a 10"} estrelas
          </span>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma avaliação disponível ainda.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={escolhida}
              onChange={(e) => setEscolhida(e.target.value)}
              className="w-full max-w-full min-w-0 appearance-none truncate rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm"
            >
              {lista.map((a) => (
                <option key={a.id} value={a.id}>
                  {nomeAluno(a.aluno_id)} — {mesExtenso(a.referencia)}
                </option>
              ))}
            </select>
          </div>

          {atual && (
            <div className="rounded-md border border-primary/40 bg-background/40 p-3">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                <Sparkles className="size-3" /> Nova avaliação · {nomeAluno(atual.aluno_id)} —{" "}
                {mesExtenso(atual.referencia)}
              </p>
              <p className="mt-1 font-display text-2xl tracking-tight">
                {media.toFixed(1)}
                <span className="text-sm text-muted-foreground">/10 avaliação geral</span>
              </p>

              {evolucao.length > 1 && (
                <div className="mt-3 h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolucao} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="currentColor" />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} stroke="currentColor" />
                      <Tooltip formatter={(v: number) => [`${v}/10`, "Média"]} />
                      <Line type="monotone" dataKey="media" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <ul className="mt-3 space-y-2">
                {CRITERIOS.map((c) => (
                  <li key={c.chave} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{c.rotulo}</span>
                    <Estrelas nota={notas[c.chave]} />
                  </li>
                ))}
              </ul>

              <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs">
                <Target className="size-3 text-primary" /> Meta atual: {atual.meta ?? metaDeNotas(notas) ?? "—"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs">
                <Trophy className="size-3 text-primary" />{" "}
                {(atual.conquistas ?? []).length > 0
                  ? (atual.conquistas ?? []).join(" · ")
                  : "Participação do mês"}
              </p>
              {atual.observacoes && (
                <p className="mt-2 border-t border-border pt-2 text-xs">
                  <span className="text-muted-foreground">Professor: </span>
                  {atual.observacoes}
                </p>
              )}

              <button
                type="button"
                onClick={() => void baixar()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Download className="size-3" /> BAIXAR RELATÓRIO EM PDF
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
