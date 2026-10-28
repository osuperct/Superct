import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown, Download, LineChart as IconeGrafico, List, Sparkles, Target } from "lucide-react";
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

export function AvaliacaoResponsavel({ uid, alunos, demo, avisoHabilitado = true }: { uid: string; alunos: Alu[]; demo?: Avaliacao[]; avisoHabilitado?: boolean }) {
  const [lista, setLista] = useState<Avaliacao[]>(demo ?? []);
  const [escolhida, setEscolhida] = useState<string>(demo?.[0]?.id ?? "");
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<"mes" | "grafico">("mes");
  const [mesHist, setMesHist] = useState<string>("");

  useEffect(() => {
    if (demo) return;
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
  }, [uid, demo]);


  const atual = lista.find((a) => a.id === escolhida) ?? null;
  const mensal = atual && mesHist ? (lista.find((a) => a.aluno_id === atual.aluno_id && a.referencia === mesHist) ?? null) : null;
  const nomeAluno = (id: string) => alunos.find((al) => al.id === id)?.nome ?? "Aluno";

  const evolucao = useMemo(() => {
    if (!atual) return [];
    return lista
      .filter((a) => a.aluno_id === atual.aluno_id)
      .slice(0, 12)
      .reverse()
      .map((a) => ({ mes: mesCurto(a.referencia), media: mediaNotas(lerNotas(a.notas)) }));
  }, [lista, atual]);

  const meses = useMemo(
    () => Array.from(new Set(lista.map((a) => a.referencia))).sort((x, y) => (x < y ? 1 : x > y ? -1 : 0)),
    [lista],
  );

  useEffect(() => {
    if (!mesHist && lista.length > 0) setMesHist(lista[0]?.referencia ?? "");
  }, [lista, mesHist]);

  async function baixar(alvo: Avaliacao) {
    try {
      const blob = await relatorioAvaliacao(
        nomeAluno(alvo.aluno_id),
        alvo,
        lista.filter((a) => a.aluno_id === alvo.aluno_id),
      );
      baixarBlob(blob, `avaliacao-${alvo.referencia}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    }
  }

  const notas = mensal ? lerNotas(mensal.notas) : {};
  const media = mediaNotas(notas);

  const recente = lista[0] ?? null;
  const chaveVisto = recente ? `avaliacao-vista-${uid}-${recente.referencia}` : "";
  const [aviso, setAviso] = useState(false);
  useEffect(() => {
    if (demo || !recente) return;
    let ativo = true;
    const doMes = lista.filter((item) => item.referencia === recente.referencia).map((item) => item.id);
    let lidoLocal = false;
    try {
      lidoLocal = !!localStorage.getItem(chaveVisto) || !!localStorage.getItem(`avaliacao-vista-${recente.id}`);
    } catch {
      /* ignore */
    }
    if (lidoLocal) {
      setAviso(false);
      return;
    }
    void supabase
      .from("avaliacoes_lidas")
      .select("avaliacao_id")
      .eq("user_id", uid)
      .in("avaliacao_id", doMes)
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) {
          setAviso(false);
          return;
        }
        const lidas = new Set((data ?? []).map((r) => r.avaliacao_id));
        const jaLido = doMes.length > 0 && doMes.every((id) => lidas.has(id));
        if (jaLido) {
          try {
            localStorage.setItem(chaveVisto, "1");
          } catch {
            /* ignore */
          }
        }
        setAviso(!jaLido);
      });
    return () => {
      ativo = false;
    };
  }, [demo, recente, chaveVisto, lista, uid]);

  function fecharAviso(abrir: boolean) {
    const doMes = lista.filter((item) => item.referencia === recente?.referencia);
    try {
      localStorage.setItem(chaveVisto, "1");
      for (const avaliacao of doMes) {
        localStorage.setItem(`avaliacao-vista-${avaliacao.id}`, "1");
      }
    } catch {
      /* ignore */
    }
    if (!demo && doMes.length > 0) {
      void supabase
        .from("avaliacoes_lidas")
        .upsert(
          doMes.map((a) => ({ user_id: uid, avaliacao_id: a.id })),
          { onConflict: "user_id,avaliacao_id", ignoreDuplicates: true },
        )
        .then(() => undefined);
    }
    setAviso(false);
    if (abrir && recente) {
      setEscolhida(recente.id);
      setAberto(true);
      setModo("mes");
      setMesHist(recente.referencia);
      setTimeout(() => document.getElementById("relatorio-mensal")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  const alunosRecentes = recente
    ? Array.from(new Set(lista.filter((a) => a.referencia === recente.referencia).map((a) => nomeAluno(a.aluno_id))))
    : [];

  return (
    <>
    {avisoHabilitado && aviso && recente && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-lg border border-evaluation-blue/40 bg-evaluation-surface p-5 text-center shadow-evaluation">
          <div className="flex items-end justify-center gap-3">
            <img src={kael} alt="" className="h-16 w-auto object-contain" />
            <Sparkles className="mb-4 size-8 fill-evaluation-star text-evaluation-star" />
            <img src={miah} alt="" className="h-16 w-auto object-contain" />
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-evaluation-orange">Nova avaliação publicada</p>
          <h3 className="font-evaluation text-3xl leading-none text-foreground">AVALIAÇÃO DE {mesExtenso(recente.referencia).toUpperCase()}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            A avaliação mensal de {alunosRecentes.join(", ")} já está disponível.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={() => fecharAviso(true)}>VER AVALIAÇÃO</Button>
            <Button variant="ghost" onClick={() => fecharAviso(false)}>MARCAR COMO LIDA</Button>
          </div>
        </div>
      </div>
    )}
    <section id="relatorio-mensal" className="mt-4 scroll-mt-4 overflow-hidden rounded-lg border border-evaluation-blue/30 bg-evaluation-surface shadow-evaluation">
      <header role="button" tabIndex={0} aria-expanded={aberto} onClick={() => setAberto((v) => !v)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAberto((v) => !v); } }} className="relative cursor-pointer border-b border-evaluation-blue/20 bg-evaluation-header px-4 py-4">
        <div className="flex items-center justify-center gap-2">
          <div className="relative flex h-16 w-12 shrink-0 items-end justify-center">
            <img src={kael} alt="Kal-El segurando uma estrela" className="h-14 w-auto object-contain drop-shadow-evaluation-blue" />
            <Sparkles className="absolute right-0 top-0 size-5 fill-evaluation-star text-evaluation-star drop-shadow-evaluation-star" />
          </div>
          <div className="min-w-0 text-center">
            <p className="font-mono text-[8px] uppercase tracking-widest text-evaluation-orange">Avaliação mensal</p>
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
        <ChevronDown className={`absolute right-3 top-3 size-5 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`} />
        {aberto && <div className="mt-3 grid grid-cols-3 gap-1.5">
          {FAIXAS.map((f) => (
            <span key={f.rotulo} className={`rounded-md border border-current/20 bg-background/30 px-1 py-1.5 text-center font-mono text-[8px] uppercase tracking-wider ${f.classe}`}>
              <strong className="block">{f.rotulo}</strong>
              {f.ate === 3 ? "1–3" : f.ate === 6 ? "4–6" : "7–10"} estrelas
            </span>
          ))}
        </div>}
      </header>

      {!aberto ? null : lista.length === 0 ? (
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
              onChange={(e) => {
                setEscolhida(e.target.value);
                const alvo = lista.find((a) => a.id === e.target.value);
                if (alvo) setMesHist(alvo.referencia);
              }}
              className="w-full max-w-full min-w-0 appearance-none truncate rounded-md bg-transparent py-2.5 pl-9 pr-3 text-sm"
            >
              {lista.map((a) => (
                <option key={a.id} value={a.id}>
                  {nomeAluno(a.aluno_id)} — {mesExtenso(a.referencia)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={modo === "mes" ? "default" : "outline"}
              onClick={() => {
                setMesHist(atual?.referencia ?? lista[0]?.referencia ?? "");
                setModo("mes");
              }}
            >
              <List className="size-4" /> HISTÓRICO
            </Button>
            <Button type="button" size="sm" variant={modo === "grafico" ? "default" : "outline"} onClick={() => setModo("grafico")}>
              <IconeGrafico className="size-4" /> VER GRÁFICO
            </Button>
          </div>

          {atual && modo === "grafico" && (
            <div className="rounded-md border border-evaluation-blue/25 bg-background/35 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Evolução de {nomeAluno(atual.aluno_id)} · média mensal
              </p>
              <div className="mt-3 h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucao} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="currentColor" />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} stroke="currentColor" />
                    <Tooltip formatter={(v: number) => [`${v}/10`, "Média"]} />
                    <Line type="monotone" dataKey="media" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                O gráfico se atualiza automaticamente a cada nova avaliação publicada no dia 28.
              </p>
            </div>
          )}

          {atual && modo === "mes" && (
            <div className="rounded-md border border-evaluation-blue/25 bg-background/35 p-3 shadow-inner">
              <div className="relative rounded-md border border-border bg-background/40">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={mesHist}
                  onChange={(e) => setMesHist(e.target.value)}
                  aria-label="Selecionar mês do histórico"
                  className="w-full max-w-full min-w-0 appearance-none truncate rounded-md bg-transparent py-2.5 pl-9 pr-3 text-sm"
                >
                  {meses.map((m) => (
                    <option key={m} value={m}>
                      {mesExtenso(m)}
                    </option>
                  ))}
                </select>
              </div>
              {mensal ? (
                <>
                  <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-primary">
                    <Sparkles className="size-3" /> Avaliação · {nomeAluno(mensal.aluno_id)} —{" "}
                    {mesExtenso(mensal.referencia)}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-evaluation-orange/25 bg-evaluation-orange/10 p-3">
                    <div>
                      <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Avaliação geral</p>
                      <p className="font-evaluation text-4xl leading-none text-evaluation-orange">{media.toFixed(1)}<span className="text-base text-muted-foreground">/10</span></p>
                    </div>
                    <TrofeuColorido className="size-12 shrink-0 drop-shadow-evaluation-star" />
                  </div>

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
                        <p className="text-xs leading-snug">{mensal.meta ?? metaDeNotas(notas) ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-md border border-evaluation-pink/30 bg-evaluation-pink/10 p-3">
                      <MedalhaColorida className="size-10 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-mono text-[8px] uppercase tracking-widest text-evaluation-pink">Conquistas</p>
                        <p className="text-xs leading-snug">
                          {(mensal.conquistas ?? []).length > 0
                            ? (mensal.conquistas ?? []).join(" · ")
                            : "Participação do mês"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {mensal.observacoes && (
                    <p className="mt-3 rounded-md border-l-2 border-evaluation-blue bg-evaluation-blue/10 p-3 text-xs leading-relaxed">
                      <span className="text-muted-foreground">Professor: </span>
                      {mensal.observacoes}
                    </p>
                  )}

                  <Button
                    type="button"
                    onClick={() => void baixar(mensal)}
                    className="mt-3 h-10 w-full font-mono text-[10px] uppercase tracking-widest"
                  >
                    <Download className="size-3" /> BAIXAR AVALIAÇÃO EM PDF
                  </Button>
                </>
              ) : (
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Nenhuma avaliação de {nomeAluno(atual.aluno_id)} neste mês.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
    </>
  );
}
