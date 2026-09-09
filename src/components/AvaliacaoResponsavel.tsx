import { useEffect, useMemo, useState } from "react";
import { Calendar, Download, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Estrelas } from "@/components/Estrelas";
import { MedalhaColorida, TrofeuColorido } from "@/components/AvaliacaoEmblemas";
import { Button } from "@/components/ui/button";
import kael from "@/assets/heroi-kael.png";
import miah from "@/assets/heroi-miah.png";
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
    <section className="mt-4 overflow-hidden rounded-lg border border-evaluation-blue/30 bg-evaluation-surface shadow-evaluation">
      <header className="relative border-b border-evaluation-blue/20 bg-evaluation-header px-4 py-4">
        <div className="flex items-center justify-center gap-2">
          <div className="relative flex h-16 w-12 shrink-0 items-end justify-center">
            <img src={kael} alt="Kal-El segurando uma estrela" className="h-14 w-auto object-contain drop-shadow-evaluation-blue" />
            <Sparkles className="absolute right-0 top-0 size-5 fill-evaluation-star text-evaluation-star drop-shadow-evaluation-star" />
          </div>
          <div className="min-w-0 text-center">
            <p className="font-mono text-[8px] uppercase tracking-widest text-evaluation-orange">Relatório mensal</p>
            <h2 className="font-evaluation text-[1.65rem] leading-none text-foreground">AVALIAÇÃO DO PROFESSOR</h2>
          </div>
          <div className="relative flex h-16 w-12 shrink-0 items-end justify-center">
            <img src={miah} alt="Miah segurando uma estrela" className="h-14 w-auto object-contain drop-shadow-evaluation-pink" />
            <Sparkles className="absolute left-0 top-0 size-5 fill-evaluation-star text-evaluation-star drop-shadow-evaluation-star" />
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Publicada todo dia 28 para acompanhar cada conquista.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {FAIXAS.map((f) => (
            <span key={f.rotulo} className={`rounded-md border border-current/20 bg-background/30 px-1 py-1.5 text-center font-mono text-[8px] uppercase tracking-wider ${f.classe}`}>
              <strong className="block">{f.rotulo}</strong>
              {f.ate === 3 ? "1–3" : f.ate === 6 ? "4–6" : "7–10"} estrelas
            </span>
          ))}
        </div>
      </header>

      {lista.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <Sparkles className="mx-auto size-7 text-evaluation-star/50" />
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma avaliação disponível ainda.</p>
        </div>
      ) : (
        <div className="space-y-3 p-3 sm:p-4">
          <div className="relative rounded-md border border-border bg-background/40">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={escolhida}
              onChange={(e) => setEscolhida(e.target.value)}
              className="w-full max-w-full min-w-0 appearance-none truncate rounded-md bg-transparent py-2.5 pl-9 pr-3 text-sm"
            >
              {lista.map((a) => (
                <option key={a.id} value={a.id}>
                  {nomeAluno(a.aluno_id)} — {mesExtenso(a.referencia)}
                </option>
              ))}
            </select>
          </div>

          {atual && (
            <div className="rounded-md border border-evaluation-blue/25 bg-background/35 p-3 shadow-inner">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                <Sparkles className="size-3" /> Nova avaliação · {nomeAluno(atual.aluno_id)} —{" "}
                {mesExtenso(atual.referencia)}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-evaluation-orange/25 bg-evaluation-orange/10 p-3">
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Avaliação geral</p>
                  <p className="font-evaluation text-4xl leading-none text-evaluation-orange">{media.toFixed(1)}<span className="text-base text-muted-foreground">/10</span></p>
                </div>
                <TrofeuColorido className="size-12 shrink-0 drop-shadow-evaluation-star" />
              </div>

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

              <ul className="mt-3 space-y-2 rounded-md border border-border bg-evaluation-surface/80 p-3">
                {CRITERIOS.map((c) => (
                  <li key={c.chave} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{c.rotulo}</span>
                    <Estrelas nota={notas[c.chave]} />
                  </li>
                ))}
              </ul>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-md border border-evaluation-orange/30 bg-evaluation-orange/10 p-3">
                  <TrofeuColorido className="size-10 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-evaluation-orange">Meta atual</p>
                    <p className="text-xs leading-snug">{atual.meta ?? metaDeNotas(notas) ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-md border border-evaluation-pink/30 bg-evaluation-pink/10 p-3">
                  <MedalhaColorida className="size-10 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-evaluation-pink">Conquistas</p>
                    <p className="text-xs leading-snug">
                      {(atual.conquistas ?? []).length > 0
                        ? (atual.conquistas ?? []).join(" · ")
                        : "Participação do mês"}
                    </p>
                  </div>
                </div>
              </div>
              {atual.observacoes && (
                <p className="mt-3 rounded-md border-l-2 border-evaluation-blue bg-evaluation-blue/10 p-3 text-xs leading-relaxed">
                  <span className="text-muted-foreground">Professor: </span>
                  {atual.observacoes}
                </p>
              )}

              <Button
                type="button"
                onClick={() => void baixar()}
                className="mt-3 h-10 w-full font-mono text-[10px] uppercase tracking-widest"
              >
                <Download className="size-3" /> BAIXAR RELATÓRIO EM PDF
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
