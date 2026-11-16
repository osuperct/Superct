import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, MoveRight, Search, Timer, Trophy, X, Zap } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { gerarPdfSuper } from "@/lib/superPdf";
import { FileDown } from "lucide-react";
import { TrofeuColorido } from "@/components/AvaliacaoEmblemas";
import arteAreaSuper from "@/assets/area-super-super-ct.png";
import mascotesExercicio from "@/assets/super-ct-personagens-escudo.jpg";
import imgTaf from "@/assets/super-taf-personagens.jpg";
import imgCorrida from "@/assets/super-corrida-personagens.jpg";
import imgDistancia from "@/assets/super-salto-distancia-personagens.jpg";
import imgCaixa from "@/assets/super-caixa-personagens.jpg";
import {
  MAX_VOLTAS,
  PROVAS_TAF,
  type DadosTaf,
  type RegistroSuper,
  formatarTempo,
  ganhouOuro,
  lerCorrida,
  limitar,
  trofeusTaf,
  CAIXAS_SALTO,
  DISTANCIAS_SALTO,
  MAX_TEMPO_CAIXA_MS,
  type CaixaSalto,
  formatarMetros,
  lerSalto,
} from "@/lib/avaliacaoSuper";

type Alu = { id: string; nome: string; user_id: string };

function Cronometro({ aoParar, rotulo = "PARAR E GRAVAR", maxMs }: { aoParar: (ms: number) => void; rotulo?: string; maxMs?: number }) {
  const [inicio, setInicio] = useState<number | null>(null);
  const [agora, setAgora] = useState(0);
  const [final, setFinal] = useState<number | null>(null);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (inicio === null) return;
    ref.current = window.setInterval(() => setAgora(Date.now()), 100);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [inicio]);
  useEffect(() => {
    if (inicio !== null && maxMs && agora - inicio >= maxMs) { setInicio(null); setFinal(maxMs); aoParar(maxMs); }
  }, [agora, inicio, maxMs, aoParar]);
  const ms = inicio !== null ? Math.min(agora - inicio, maxMs ?? Infinity) : (final ?? 0);
  return (
    <div className="rounded-md border border-border bg-background/60 p-3 text-center">
      <p className="font-mono text-3xl tabular-nums text-primary">{formatarTempo(ms)}</p>
      {inicio === null ? (
        <button type="button" onClick={() => { const t = Date.now(); setInicio(t); setAgora(t); setFinal(null); }} className="mt-2 w-full rounded-md bg-primary px-4 py-3 font-display text-sm text-primary-foreground">
          {final === null ? "INICIAR" : "REINICIAR"}
        </button>
      ) : (
        <button type="button" onClick={() => { const t = Math.min(Date.now() - inicio, maxMs ?? Infinity); setInicio(null); setFinal(t); aoParar(t); }} className="mt-2 w-full rounded-md bg-destructive px-4 py-3 font-display text-sm text-destructive-foreground">
          {rotulo}
        </button>
      )}
    </div>
  );
}

function Voltas({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      <span className="mr-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Voltas:</span>
      {Array.from({ length: MAX_VOLTAS }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className={`size-8 rounded-md border text-xs ${valor === n ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
          {n}
        </button>
      ))}
    </div>
  );
}

function Janela({ aberto, onOpenChange, titulo, icone, children, semArte }: { aberto: boolean; onOpenChange: (v: boolean) => void; titulo: string; icone: React.ReactNode; children: React.ReactNode; semArte?: boolean }) {
  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="z-[70] flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden p-0 [&>button.absolute]:hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <DialogTitle className="flex min-w-0 items-center gap-2 font-display text-base">{icone} <span className="truncate">{titulo}</span></DialogTitle>
          <span className="flex shrink-0 items-center gap-1">
            {!semArte && <img src={mascotesExercicio} alt="Personagens do Super CT no escudo" loading="lazy" width={500} height={595} className="h-20 w-auto rounded-md object-contain" />}
            <DialogClose className="rounded-md p-1 hover:bg-muted" aria-label="Fechar"><X className="size-5" /></DialogClose>
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

function Topico({ titulo, icone, children }: { titulo: string; icone: React.ReactNode; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="mt-2 flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-3 font-display text-sm hover:border-primary">
        <span className="flex items-center gap-2">{icone} {titulo}</span>
        <ChevronRight className="size-4" />
      </button>
      <Janela aberto={aberto} onOpenChange={setAberto} titulo={titulo} icone={icone}>{children}</Janela>
    </>
  );
}

function ListaRegistros({ itens, onApagar, vazio }: { itens: { id: string; titulo: string; detalhe: string }[]; onApagar: (id: string) => void; vazio: string }) {
  return (
    <ul className="mt-3 space-y-1">
      {itens.map((it) => (
        <li key={it.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-xs">
          <span className="min-w-0">
            <b>{it.titulo}</b>
            <span className="block">{it.detalhe}</span>
          </span>
          <button type="button" onClick={() => onApagar(it.id)} className="shrink-0 text-destructive underline">apagar</button>
        </li>
      ))}
      {itens.length === 0 && <li className="text-center text-xs text-muted-foreground">{vazio}</li>}
    </ul>
  );
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const dataBr = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const diaMes = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

function SecaoHist({ titulo, colunas, linhas, grafico }: { titulo: string; colunas: string[]; linhas: string[][]; grafico: React.ReactElement }) {
  const [modo, setModo] = useState<"tabela" | "grafico">("tabela");
  return (
    <div className="rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">{titulo}</p>
        <div className="flex gap-1">
          {(["tabela", "grafico"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setModo(m)} className={`rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${modo === m ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
              {m === "tabela" ? "Tabela" : "Gráfico"}
            </button>
          ))}
        </div>
      </div>
      {modo === "tabela" ? (
        <table className="mt-2 w-full text-left text-xs">
          <thead><tr className="border-b border-border font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{colunas.map((c) => <th key={c} className="py-1 pr-2">{c}</th>)}</tr></thead>
          <tbody>{linhas.map((l, i) => <tr key={i} className="border-b border-border/40">{l.map((v, j) => <td key={j} className={`py-1.5 pr-2 ${j === 0 ? "text-muted-foreground" : "font-semibold text-foreground"}`}>{v}</td>)}</tr>)}</tbody>
        </table>
      ) : (
        <div className="mt-2 h-44"><ResponsiveContainer width="100%" height="100%">{grafico}</ResponsiveContainer></div>
      )}
    </div>
  );
}

export function HistoricoSuper({ registros: todos, parte }: { registros: RegistroSuper[]; parte?: "taf" | "exercicios" }) {
  const registros = todos.filter((r) => !parte || (parte === "taf" ? r.tipo === "taf" : r.tipo !== "taf"));
  const tafs = registros.filter((r) => r.tipo === "taf").sort((a, b) => a.ano - b.ano);
  const corridas = registros
    .filter((r) => r.tipo === "corrida")
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) => ({ r, c: lerCorrida(r.dados) }))
    .filter((x) => x.c);
  const saltos = registros
    .filter((r) => r.tipo === "salto")
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) => ({ r, s: lerSalto(r.dados) }))
    .filter((x) => x.s);
  const distancias = saltos.filter((x) => x.s!.modo === "distancia");
  const caixas = saltos.filter((x) => x.s!.modo === "caixa");
  const nomeCaixa = (c: CaixaSalto) => CAIXAS_SALTO.find((x) => x.chave === c)?.rotulo ?? c;
  if (registros.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma avaliação Super ainda.</p>;
  return (
    <div className="space-y-3">
      {tafs.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">TAF SUPER CT</p>
          {tafs.slice().reverse().map((t) => {
            const d = t.dados as DadosTaf;
            const c = lerCorrida(d.corrida);
            return (
              <div key={t.id} className="mt-2 rounded-md border border-border p-2 text-xs">
                <p className="font-display text-sm">{t.ano} · {trofeusTaf(d)} troféus de ouro</p>
                {c && <p className="mt-1 text-muted-foreground">Corrida: {formatarTempo(c.tempo_ms)} · {c.voltas} volta(s)</p>}
                <ul className="mt-1 space-y-1">
                  {PROVAS_TAF.map((p) => (
                    <li key={p.chave} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{p.rotulo}</span>
                      <span className="flex items-center gap-1">{d[p.chave] ?? 0} {p.unidade}{ganhouOuro(p.chave, d[p.chave]) && <TrofeuColorido className="size-5" />}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {tafs.length > 1 && (
            <div className="mt-2 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tafs.map((t) => ({ ano: String(t.ano), trofeus: trofeusTaf(t.dados as DadosTaf) }))}>
                  <XAxis dataKey="ano" fontSize={10} /><YAxis domain={[0, PROVAS_TAF.length]} allowDecimals={false} fontSize={10} width={20} /><Tooltip />
                  <Bar dataKey="trofeus" name="Troféus" fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
      {corridas.length > 0 && (
        <SecaoHist titulo="SUPER CORRIDA" colunas={["Data", "Tempo", "Voltas"]}
          linhas={corridas.slice().reverse().map(({ r, c }) => [dataBr(r.created_at), formatarTempo(c!.tempo_ms), String(c!.voltas)])}
          grafico={
            <ScatterChart margin={{ bottom: 12 }}>
              <XAxis type="number" dataKey="voltas" name="Voltas" domain={[0, 10]} allowDecimals={false} fontSize={10} label={{ value: "Voltas", position: "insideBottom", offset: -6, fontSize: 10 }} />
              <YAxis type="number" dataKey="seg" name="Tempo (s)" fontSize={10} width={32} label={{ value: "Tempo (s)", angle: -90, position: "insideLeft", fontSize: 10 }} />
              <Tooltip formatter={(v, n) => (n === "Tempo (s)" ? `${v} s` : v)} />
              <Scatter data={corridas.map(({ c }) => ({ voltas: c!.voltas, seg: Math.round(c!.tempo_ms / 100) / 10 }))} fill="var(--primary)" />
            </ScatterChart>
          } />
      )}
      {distancias.length > 0 && (
        <SecaoHist titulo="SALTO A DISTÂNCIA" colunas={["Data", "Distância"]}
          linhas={distancias.slice().reverse().map(({ r, s }) => [dataBr(r.created_at), s!.modo === "distancia" ? formatarMetros(s!.metros) : "—"])}
          grafico={
            <LineChart data={distancias.map(({ r, s }) => ({ dia: diaMes(r.created_at), metros: s!.modo === "distancia" ? s!.metros : 0 }))}>
              <XAxis dataKey="dia" fontSize={10} /><YAxis domain={[0, 3]} fontSize={10} width={24} /><Tooltip />
              <Line dataKey="metros" name="Distância (m)" stroke="var(--primary)" strokeWidth={2} />
            </LineChart>
          } />
      )}
      {caixas.length > 0 && (
        <SecaoHist titulo="SALTO NA CAIXA CROSS" colunas={["Data", "Caixa", "Tempo"]}
          linhas={caixas.slice().reverse().map(({ r, s }) => [dataBr(r.created_at), s!.modo === "caixa" ? nomeCaixa(s!.caixa) : "—", s!.modo === "caixa" ? formatarTempo(s!.tempo_ms) : "—"])}
          grafico={
            <LineChart data={caixas.map(({ r, s }) => ({ dia: diaMes(r.created_at), seg: s!.modo === "caixa" ? Math.round(s!.tempo_ms / 100) / 10 : 0 }))}>
              <XAxis dataKey="dia" fontSize={10} /><YAxis domain={[0, 60]} fontSize={10} width={24} /><Tooltip />
              <Line dataKey="seg" name="Tempo (s)" stroke="var(--primary)" strokeWidth={2} />
            </LineChart>
          } />
      )}
    </div>
  );
}

export function AvaliacaoSuper({ alunos, professorId }: { alunos: Alu[]; professorId: string }) {
  const ano = new Date().getFullYear();
  const [alunoId, setAlunoId] = useState("");
  const [registros, setRegistros] = useState<RegistroSuper[]>([]);
  const [taf, setTaf] = useState<DadosTaf>({});
  const [voltasTaf, setVoltasTaf] = useState(1);
  const [voltas, setVoltas] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [caixa, setCaixa] = useState<CaixaSalto>("slim");
  const aluno = alunos.find((a) => a.id === alunoId) ?? null;
  const [janela, setJanela] = useState(false);
  const [corridaMs, setCorridaMs] = useState<number | null>(null);
  const [verCorridas, setVerCorridas] = useState(false);
  const [verTafs, setVerTafs] = useState(false);
  const [verDistancias, setVerDistancias] = useState(false);
  const [verCaixas, setVerCaixas] = useState(false);
  const [busca, setBusca] = useState("");
  const filtrados = alunos.filter((a) => semAcento(a.nome).includes(semAcento(busca.trim())));
  const tafAno = registros.find((r) => r.tipo === "taf" && r.ano === ano) ?? null;

  const carregar = useCallback(async (id: string) => {
    if (!id) { setRegistros([]); return; }
    const { data } = await supabase.from("avaliacoes_super").select("*").eq("aluno_id", id).order("created_at");
    const lista = (data ?? []) as RegistroSuper[];
    setRegistros(lista);
    const t = lista.find((r) => r.tipo === "taf" && r.ano === ano);
    setTaf(((t?.dados as DadosTaf) ?? {}));
    setVoltasTaf(lerCorrida((t?.dados as DadosTaf | undefined)?.corrida)?.voltas ?? 1);
  }, [ano]);

  useEffect(() => { void carregar(alunoId); }, [alunoId, carregar]);

  async function salvarTaf() {
    if (!aluno) return;
    setSalvando(true);
    const dados: DadosTaf = { ...taf };
    if (taf.corrida) dados.corrida = { ...taf.corrida, voltas: voltasTaf };
    const q = tafAno
      ? supabase.from("avaliacoes_super").update({ dados, professor_id: professorId }).eq("id", tafAno.id)
      : supabase.from("avaliacoes_super").insert({ aluno_id: aluno.id, user_id: aluno.user_id, professor_id: professorId, tipo: "taf", ano, dados });
    const { error } = await q;
    setSalvando(false);
    if (error) { toast.error("Não foi possível salvar o TAF."); return; }
    toast.success(`TAF salvo — ${trofeusTaf(dados)} troféus de ouro!`);
    void carregar(aluno.id);
  }

  async function apagarRegistro(id: string) {
    if (!aluno || !window.confirm("Apagar este registro?")) return;
    const { error } = await supabase.from("avaliacoes_super").delete().eq("id", id);
    if (error) { toast.error("Não foi possível apagar."); return; }
    toast.success("Registro apagado.");
    void carregar(aluno.id);
  }

  async function salvarCorrida(ms: number) {
    if (!aluno) return;
    setSalvando(true);
    const { error } = await supabase.from("avaliacoes_super").insert({ aluno_id: aluno.id, user_id: aluno.user_id, professor_id: professorId, tipo: "corrida", ano, dados: { tempo_ms: ms, voltas } });
    setSalvando(false);
    if (error) { toast.error("Não foi possível gravar a corrida."); return; }
    setCorridaMs(null);
    toast.success(`Corrida gravada: ${formatarTempo(ms)} · ${voltas} volta(s)`);
    void carregar(aluno.id);
  }

  async function salvarSalto(dados: { modo: "distancia"; metros: number } | { modo: "caixa"; caixa: CaixaSalto; tempo_ms: number }) {
    if (!aluno) return;
    const { error } = await supabase.from("avaliacoes_super").insert({ aluno_id: aluno.id, user_id: aluno.user_id, professor_id: professorId, tipo: "salto", ano, dados });
    if (error) { toast.error("Não foi possível gravar o salto."); return; }
    toast.success(dados.modo === "distancia" ? `Salto gravado: ${formatarMetros(dados.metros)}` : `Salto na caixa gravado: ${formatarTempo(dados.tempo_ms)}`);
    void carregar(aluno.id);
  }

  return (
    <>
    <button type="button" onClick={() => setJanela(true)} className="mt-4 flex w-full items-center justify-between gap-2 rounded-lg border border-primary/40 bg-background/40 p-3 text-left">
      <span>
        <span className="flex items-center gap-2 font-display text-base tracking-tight"><Zap className="size-4 text-primary" /> ÁREA SUPER</span>
        <span className="mt-1 block text-xs text-muted-foreground">TAF, corrida, salto a distância e salto na caixa.</span>
      </span>
      <ChevronRight className="size-5 shrink-0" />
    </button>
    <Janela aberto={janela} onOpenChange={setJanela} semArte={!!aluno} titulo={aluno ? aluno.nome : "ÁREA SUPER"} icone={<Zap className="size-4 text-primary" />}>
      {!aluno ? (
        <>
          <p className="text-xs text-muted-foreground">Somente alunos ativos. Os resultados aparecem automaticamente na avaliação do aluno para o responsável.</p>
          <label className="mt-2 flex items-center gap-2 rounded-md border border-border bg-background px-3">
            <Search className="size-4 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno pelo nome…" className="w-full bg-transparent py-3 text-sm outline-none" />
          </label>
          <ul className="mt-2 space-y-1">
            {filtrados.map((a) => (
              <li key={a.id}><button type="button" onClick={() => setAlunoId(a.id)} className="flex w-full items-center justify-between rounded-md border border-border px-3 py-3 text-left text-sm hover:border-primary"><span className="min-w-0 truncate">{a.nome}</span><ChevronRight className="size-4 shrink-0" /></button></li>
            ))}
            {filtrados.length === 0 && <li className="py-4 text-center text-xs text-muted-foreground">Nenhum aluno encontrado.</li>}
          </ul>
        </>
      ) : (
        <button type="button" onClick={() => { setAlunoId(""); setCorridaMs(null); }} className="text-xs text-primary underline">← Trocar aluno</button>
      )}
      {aluno && (
        <>
          <Topico titulo="TAF SUPER CT" icone={<Trophy className="size-4 text-primary" />}>
            <p className="text-xs text-muted-foreground">Feito uma vez por ano.{tafAno ? " Este aluno já tem TAF neste ano — salvar vai atualizar." : ""}</p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-primary">Prova de corrida</p>
            <Voltas valor={voltasTaf} onChange={setVoltasTaf} />
            <div className="mt-2"><Cronometro rotulo="PARAR E MARCAR" aoParar={(ms) => setTaf((t) => ({ ...t, corrida: { tempo_ms: ms, voltas: voltasTaf } }))} /></div>
            {taf.corrida && <p className="mt-1 text-xs">Tempo marcado: {formatarTempo(taf.corrida.tempo_ms)}</p>}
            <ul className="mt-3 space-y-2">
              {PROVAS_TAF.map((p) => (
                <li key={p.chave} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    {p.rotulo}
                    <span className="block font-mono text-[9px] uppercase text-muted-foreground">até {p.max} · ouro com {p.ouro}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    {ganhouOuro(p.chave, taf[p.chave]) && <TrofeuColorido className="size-6" />}
                    <input type="number" inputMode="numeric" min={0} max={p.max} value={taf[p.chave] ?? ""} onChange={(e) => setTaf((t) => ({ ...t, [p.chave]: e.target.value === "" ? undefined : limitar(Number(e.target.value), p.max) }))} className="w-20 rounded-md border border-border bg-background px-2 py-2 text-center" />
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" disabled={salvando} onClick={() => void salvarTaf()} className="mt-3 w-full rounded-md bg-primary px-4 py-3 font-display text-sm text-primary-foreground disabled:opacity-50">
              SALVAR TAF ({trofeusTaf(taf)} TROFÉUS)
            </button>
            <button type="button" onClick={() => setVerTafs((v) => !v)} className="mt-2 w-full rounded-md border border-border py-3 font-display text-xs">REGISTROS</button>
            {verTafs && (
              <ListaRegistros
                vazio="Nenhum TAF salvo."
                onApagar={(id) => void apagarRegistro(id)}
                itens={registros.filter((r) => r.tipo === "taf").map((r) => {
                  const d = r.dados as DadosTaf;
                  return {
                    id: r.id,
                    titulo: `${dataBr(r.created_at)} · TAF ${r.ano}`,
                    detalhe: `${trofeusTaf(d)} troféu(s) de ouro`,
                  };
                })}
              />
            )}
          </Topico>
          <Topico titulo="SUPER CORRIDA" icone={<Timer className="size-4 text-primary" />}>
            <p className="text-xs text-muted-foreground">Inicie e pare o cronômetro. Depois confira as voltas (1 a 10) e toque em SALVAR. Só vai para o histórico depois de salvar.</p>
            <div className="mt-2"><Cronometro rotulo="PARAR" aoParar={(ms) => setCorridaMs(ms)} /></div>
            <Voltas valor={voltas} onChange={setVoltas} />
            {corridaMs !== null && (
              <p className="mt-2 text-center text-sm">Resultado: <b>{formatarTempo(corridaMs)}</b> · {voltas} volta(s)</p>
            )}
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button type="button" disabled={corridaMs === null || salvando} onClick={() => corridaMs !== null && void salvarCorrida(corridaMs)} className="rounded-md bg-primary py-3 font-display text-xs text-primary-foreground disabled:opacity-40">SALVAR</button>
              <button type="button" disabled={corridaMs === null} onClick={() => setCorridaMs(null)} className="rounded-md border border-destructive py-3 font-display text-xs text-destructive disabled:opacity-40">EXCLUIR</button>
              <button type="button" onClick={() => setVerCorridas((v) => !v)} className="rounded-md border border-border py-3 font-display text-xs">REGISTROS</button>
            </div>
            {verCorridas && (
              <ul className="mt-3 space-y-1">
                {registros.filter((r) => r.tipo === "corrida").map((r) => {
                  const c = lerCorrida(r.dados);
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-xs">
                      <span className="min-w-0">
                        <b>{new Date(r.created_at).toLocaleDateString("pt-BR")}</b> {new Date(r.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        <span className="block">Tempo: <b>{c ? formatarTempo(c.tempo_ms) : "—"}</b> · Voltas: <b>{c ? c.voltas : "—"}</b></span>
                      </span>
                      <button type="button" onClick={() => void apagarRegistro(r.id)} className="text-destructive underline">apagar</button>
                    </li>
                  );
                })}
                {registros.every((r) => r.tipo !== "corrida") && <li className="text-center text-xs text-muted-foreground">Nenhuma corrida salva.</li>}
              </ul>
            )}
          </Topico>
          <Topico titulo="SALTO A DISTÂNCIA" icone={<MoveRight className="size-4 text-primary" />}>
            <p className="text-xs text-muted-foreground">Toque na distância alcançada para gravar.</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {DISTANCIAS_SALTO.map((m) => (
                <button key={m} type="button" onClick={() => void salvarSalto({ modo: "distancia", metros: m })} className="rounded-md border border-border py-3 font-display text-sm hover:border-primary">
                  {formatarMetros(m)}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setVerDistancias((v) => !v)} className="mt-2 w-full rounded-md border border-border py-3 font-display text-xs">REGISTROS</button>
            {verDistancias && (
              <ListaRegistros
                vazio="Nenhum salto a distância salvo."
                onApagar={(id) => void apagarRegistro(id)}
                itens={registros
                  .filter((r) => r.tipo === "salto")
                  .map((r) => ({ r, s: lerSalto(r.dados) }))
                  .filter((x) => x.s?.modo === "distancia")
                  .map(({ r, s }) => ({
                    id: r.id,
                    titulo: `${dataBr(r.created_at)} ${new Date(r.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
                    detalhe: `Distância: ${s!.modo === "distancia" ? formatarMetros(s!.metros) : "—"}`,
                  }))}
              />
            )}
          </Topico>
          <Topico titulo="SALTO NA CAIXA" icone={<MoveRight className="size-4 text-primary" />}>
            <p className="text-xs text-muted-foreground">Escolha a caixa. Máximo de 1 minuto — ao parar (ou ao chegar em 1 minuto) o tempo é gravado.</p>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {CAIXAS_SALTO.map((c) => (
                <button key={c.chave} type="button" onClick={() => setCaixa(c.chave)} className={`rounded-md border py-2 text-xs ${caixa === c.chave ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                  {c.rotulo}
                </button>
              ))}
            </div>
            <div className="mt-2"><Cronometro maxMs={MAX_TEMPO_CAIXA_MS} aoParar={(ms) => void salvarSalto({ modo: "caixa", caixa, tempo_ms: ms })} /></div>
            <button type="button" onClick={() => setVerCaixas((v) => !v)} className="mt-2 w-full rounded-md border border-border py-3 font-display text-xs">REGISTROS</button>
            {verCaixas && (
              <ListaRegistros
                vazio="Nenhum salto na caixa salvo."
                onApagar={(id) => void apagarRegistro(id)}
                itens={registros
                  .filter((r) => r.tipo === "salto")
                  .map((r) => ({ r, s: lerSalto(r.dados) }))
                  .filter((x) => x.s?.modo === "caixa")
                  .map(({ r, s }) => ({
                    id: r.id,
                    titulo: `${dataBr(r.created_at)} ${new Date(r.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
                    detalhe: s!.modo === "caixa" ? `Caixa: ${CAIXAS_SALTO.find((c) => c.chave === s!.caixa)?.rotulo ?? s!.caixa} · Tempo: ${formatarTempo(s!.tempo_ms)}` : "—",
                  }))}
              />
            )}
          </Topico>
          <Topico titulo="HISTÓRICO E GRÁFICO" icone={<Zap className="size-4 text-primary" />}>
            <HistoricoSuper registros={registros} />
          </Topico>
        </>
      )}
      <Topico titulo="RELATÓRIO EM PDF" icone={<FileDown className="size-4 text-primary" />}>
        <RelatorioPdfSuper alunos={alunos} aluno={aluno} />
      </Topico>
      <Topico titulo="RANKING" icone={<Trophy className="size-4 text-primary" />}>
        <RankingSuper chave={registros.length} />
      </Topico>
    </Janela>
    </>
  );
}

function RelatorioPdfSuper({ alunos, aluno }: { alunos: Alu[]; aluno: Alu | null }) {
  const hoje = new Date();
  const [mes, setMes] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
  const [conteudo, setConteudo] = useState<"tudo" | "taf" | "exercicios">("tudo");
  const [gerando, setGerando] = useState(false);
  async function gerar(escopo: "mes" | "ano" | "aluno") {
    setGerando(true);
    const [a, m] = mes.split("-").map(Number) as [number, number];
    let q = supabase.from("avaliacoes_super").select("*").order("created_at");
    let titulo = "";
    if (escopo === "aluno" && aluno) { q = q.eq("aluno_id", aluno.id); titulo = aluno.nome; }
    else if (escopo === "ano") { q = q.gte("created_at", `${a}-01-01`).lt("created_at", `${a + 1}-01-01`); titulo = `Ano ${a}`; }
    else {
      const fim = m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`;
      q = q.gte("created_at", `${mes}-01`).lt("created_at", fim);
      titulo = new Date(a, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    }
    if (conteudo === "taf") { q = q.eq("tipo", "taf"); titulo = `TAF - ${titulo}`; }
    else if (conteudo === "exercicios") { q = q.neq("tipo", "taf"); titulo = `Super Exercicios - ${titulo}`; }
    const { data, error } = await q;
    if (error) { setGerando(false); toast.error("Não foi possível gerar o PDF."); return; }
    try { await gerarPdfSuper(titulo, escopo === "aluno" && aluno ? [aluno] : alunos, (data ?? []) as RegistroSuper[]); }
    catch { toast.error("Não foi possível gerar o PDF."); }
    setGerando(false);
  }
  const opcoes: { chave: "tudo" | "taf" | "exercicios"; rotulo: string }[] = [
    { chave: "tudo", rotulo: "TUDO" },
    { chave: "taf", rotulo: "TAF SUPER CT" },
    { chave: "exercicios", rotulo: "SUPER EXERCÍCIOS" },
  ];
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Escolha o que entra no relatório: só o TAF, só os Super Exercícios (corrida e saltos) ou tudo junto.</p>
      <div className="grid grid-cols-3 gap-2">
        {opcoes.map((o) => (
          <button key={o.chave} type="button" onClick={() => setConteudo(o.chave)}
            className={`rounded-md border py-2 font-display text-[10px] ${conteudo === o.chave ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
            {o.rotulo}
          </button>
        ))}
      </div>
      <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={gerando} onClick={() => void gerar("mes")} className="rounded-md bg-primary py-3 font-display text-xs text-primary-foreground disabled:opacity-50">PDF DO MÊS</button>
        <button type="button" disabled={gerando} onClick={() => void gerar("ano")} className="rounded-md border border-primary py-3 font-display text-xs disabled:opacity-50">PDF DO ANO</button>
      </div>
    </div>
  );
}

function BotaoSuper({ titulo, descricao, icone, onClick }: { titulo: string; descricao: string; icone: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-transparent px-3 py-4 text-left hover:border-primary">
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-display text-sm">{icone} {titulo}</span>
        <span className="mt-1 block text-xs leading-snug text-muted-foreground">{descricao}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function linhasAviso(r: RegistroSuper): [string, string][] {
  if (r.tipo === "taf") {
    const d = (r.dados ?? {}) as DadosTaf;
    const out: [string, string][] = [];
    const c = lerCorrida(d.corrida);
    if (c) out.push(["Corrida", `${formatarTempo(c.tempo_ms)} · ${c.voltas} volta(s)`]);
    for (const p of PROVAS_TAF) {
      const v = d[p.chave];
      if (v !== undefined) out.push([p.rotulo, `${v}${ganhouOuro(p.chave, v) ? " 🏆" : ""}`]);
    }
    out.push(["Troféus de ouro", String(trofeusTaf(d))]);
    return out;
  }
  if (r.tipo === "corrida") {
    const c = lerCorrida(r.dados);
    return c ? [["Super Corrida", `${formatarTempo(c.tempo_ms)} · ${c.voltas} volta(s)`]] : [];
  }
  const s = lerSalto(r.dados);
  if (!s) return [];
  if (s.modo === "distancia") return [["Salto a distância", formatarMetros(s.metros)]];
  return [[`Caixa ${CAIXAS_SALTO.find((c) => c.chave === s.caixa)?.rotulo ?? s.caixa}`, formatarTempo(s.tempo_ms)]];
}

export function SuperResponsavel({ uid, alunos, avisoHabilitado = true }: { uid: string; alunos: { id: string; nome: string }[]; avisoHabilitado?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [novas, setNovas] = useState<RegistroSuper[]>([]);
  const [tela, setTela] = useState<"menu" | "taf" | "exercicios" | "ranking">("menu");
  const [registros, setRegistros] = useState<RegistroSuper[]>([]);
  const [alunoId, setAlunoId] = useState(alunos[0]?.id ?? "");
  useEffect(() => {
    if (uid === "demo") return;
    void supabase.from("avaliacoes_super").select("*").eq("user_id", uid).order("created_at").then(async ({ data }) => {
      const regs = (data ?? []) as RegistroSuper[];
      setRegistros(regs);
      if (regs.length === 0) return;
      try { if (sessionStorage.getItem(`super-lembrar-${uid}`)) return; } catch { /* ignore */ }
      const { data: lidas, error } = await supabase.from("avaliacoes_super_lidas").select("avaliacao_id").eq("user_id", uid);
      if (error) return;
      const vistos = new Set((lidas ?? []).map((l) => l.avaliacao_id));
      setNovas(regs.filter((r) => !vistos.has(r.id)));
    });
  }, [uid]);

  function responderAviso(ver: boolean, ehTaf: boolean) {
    const pendentes = novas.filter((r) => (r.tipo === "taf") === ehTaf);
    setNovas(ver ? novas.filter((r) => (r.tipo === "taf") !== ehTaf) : []);
    if (!ver) {
      try { sessionStorage.setItem(`super-lembrar-${uid}`, "1"); } catch { /* ignore */ }
      return;
    }
    void supabase.from("avaliacoes_super_lidas")
      .upsert(pendentes.map((r) => ({ user_id: uid, avaliacao_id: r.id })), { onConflict: "user_id,avaliacao_id", ignoreDuplicates: true })
      .then(() => undefined);
    const ultima = pendentes[pendentes.length - 1];
    if (ultima) setAlunoId(ultima.aluno_id);
    setTela(ehTaf ? "taf" : "exercicios");
    setAberto(true);
  }
  const ultimaNova = novas[novas.length - 1];
  const comDados = alunos.filter((a) => registros.some((r) => r.aluno_id === a.id));
  const atual = comDados.find((a) => a.id === alunoId) ?? comDados[0];
  const doAluno = atual ? registros.filter((r) => r.aluno_id === atual.id) : [];
  const telas = {
    menu: { titulo: "ÁREA SUPER", icone: <Zap className="size-4 text-primary" /> },
    taf: { titulo: "TAF SUPER CT", icone: <Trophy className="size-4 text-primary" /> },
    exercicios: { titulo: "SUPER EXERCÍCIOS", icone: <Zap className="size-4 text-primary" /> },
    ranking: { titulo: "RANKING DA ÁREA SUPER", icone: <Trophy className="size-4 text-primary" /> },
  } as const;

  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-evaluation-blue/30 bg-evaluation-surface shadow-evaluation">
      {avisoHabilitado && ultimaNova && !aberto && (() => {
        const ehTaf = ultimaNova.tipo === "taf";
        const doGrupo = novas.filter((r) => (r.tipo === "taf") === ehTaf);
        const linhas = doGrupo.flatMap(linhasAviso);
        const salto = !ehTaf ? lerSalto(ultimaNova.dados) : null;
        const arte = ehTaf ? imgTaf : ultimaNova.tipo === "corrida" ? imgCorrida : salto?.modo === "caixa" ? imgCaixa : imgDistancia;
        return (
        <div role="dialog" aria-modal="true" aria-labelledby="aviso-super-titulo" className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-primary/40 bg-evaluation-surface p-4 shadow-evaluation">
            <p className="text-center font-mono text-[10px] uppercase tracking-widest text-evaluation-orange">Nova avaliação da Área Super</p>
            <h3 id="aviso-super-titulo" className="text-center font-evaluation text-2xl leading-none text-foreground">{ehTaf ? "TAF SUPER CT" : "SUPER EXERCÍCIOS"}</h3>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {Array.from(new Set(doGrupo.map((r) => alunos.find((x) => x.id === r.aluno_id)?.nome ?? "Aluno"))).join(", ")} · {new Date(ultimaNova.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </p>
            <div className="mt-3 flex items-start gap-3">
              <table className="min-w-0 flex-1 text-left text-xs">
                <thead><tr className="border-b border-border font-mono text-[9px] uppercase tracking-wider text-muted-foreground"><th className="py-1 pr-2">Avaliação</th><th className="py-1">Resultado</th></tr></thead>
                <tbody>
                  {linhas.map((l, i) => (
                    <tr key={i} className="border-b border-border/40"><td className="py-1.5 pr-2 text-foreground">{l[0]}</td><td className="py-1.5 font-semibold text-primary">{l[1]}</td></tr>
                  ))}
                </tbody>
              </table>
              <img src={arte} alt="Personagens do Super CT fazendo o exercício avaliado" width={816} height={816} className="size-24 shrink-0 rounded-md border border-primary/30 object-cover sm:size-28" />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={() => responderAviso(true, ehTaf)}>VER AVALIAÇÃO</Button>
              <Button variant="ghost" onClick={() => responderAviso(false, ehTaf)}>ME LEMBRAR DEPOIS</Button>
            </div>
          </div>
        </div>
        );
      })()}
      <button type="button" onClick={() => { setTela("menu"); setAberto(true); }} className="relative block w-full text-left">
        <img src={arteAreaSuper} alt="Área Super — personagens saltando na caixa Cross e subindo na corda" loading="lazy" width={1536} height={640} className="h-36 w-full object-cover sm:h-44" />
        <span className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" aria-hidden="true" />
        <span className="absolute bottom-2 left-3 flex items-center gap-1.5 rounded-md border border-primary/40 bg-background/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
          <Zap className="size-3.5" /> Abrir Área Super
        </span>
        <ChevronRight className="absolute bottom-2 right-3 size-5 text-foreground/80" />
      </button>
      <Janela aberto={aberto} onOpenChange={(v) => { setAberto(v); if (!v) setTela("menu"); }} titulo={telas[tela].titulo} icone={telas[tela].icone}>
        {atual && comDados.length > 1 && (
          <select value={atual.id} onChange={(e) => setAlunoId(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
            {comDados.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        )}
        {tela === "menu" ? (
          <div className="mt-3 space-y-2">
            <BotaoSuper titulo="TAF SUPER CT" descricao="Avaliação anual do aluno de aptidão física e desenvolvimento." icone={<Trophy className="size-4 text-primary" />} onClick={() => setTela("taf")} />
            <BotaoSuper titulo="SUPER EXERCÍCIOS" descricao="Avaliação rotineira do aluno na corrida, salto à distância e na caixa Cross." icone={<Zap className="size-4 text-primary" />} onClick={() => setTela("exercicios")} />
            <BotaoSuper titulo="RANKING DA ÁREA SUPER" descricao="Acompanhe sua criança e os demais resultados dos super alunos do CT!" icone={<Trophy className="size-4 text-primary" />} onClick={() => setTela("ranking")} />
          </div>
        ) : (
          <div className="mt-3">
            <button type="button" onClick={() => setTela("menu")} className="mb-3 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
              <ChevronRight className="size-3 rotate-180" /> VOLTAR
            </button>
            {tela === "taf" && <HistoricoSuper parte="taf" registros={doAluno} />}
            {tela === "exercicios" && <HistoricoSuper parte="exercicios" registros={doAluno} />}
            {tela === "ranking" && <RankingSuper />}
          </div>
        )}
      </Janela>
    </section>
  );
}

type LinhaRanking = { modalidade: string; grupo: string; aluno: string; valor: number; meu: boolean };

export function RankingSuper({ chave = 0 }: { chave?: number }) {
  const [linhas, setLinhas] = useState<LinhaRanking[] | null>(null);
  const [aba, setAba] = useState<"corrida" | "distancia" | "caixa">("corrida");
  useEffect(() => {
    void supabase.rpc("ranking_super").then(({ data, error }) => setLinhas(error ? [] : ((data ?? []) as LinhaRanking[])));
  }, [chave]);
  if (linhas === null) return <p className="text-xs text-muted-foreground">Carregando…</p>;
  const daAba = linhas.filter((l) => l.modalidade === aba);
  const grupos = [...new Set(daAba.map((l) => l.grupo))].sort((a, b) => aba === "corrida" ? Number(a) - Number(b) : a.localeCompare(b));
  const rotuloGrupo = (g: string) => aba === "corrida" ? `${g} volta(s)` : aba === "caixa" ? `Caixa ${CAIXAS_SALTO.find((c) => c.chave === g)?.rotulo ?? g}` : "Salto a distância";
  const fmt = (v: number) => aba === "distancia" ? formatarMetros(v) : formatarTempo(v);
  return (
    <div>
      <div className="grid grid-cols-3 gap-1">
        {([["corrida", "CORRIDA"], ["distancia", "DISTÂNCIA"], ["caixa", "CAIXA"]] as const).map(([k, r]) => (
          <button key={k} type="button" onClick={() => setAba(k)} className={`rounded-md border py-2 text-[11px] font-display ${aba === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{r}</button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{aba === "corrida" ? "Separado por número de voltas · menor tempo primeiro." : aba === "distancia" ? "Maior distância primeiro." : "Separado por caixa · maior tempo primeiro."}</p>
      {grupos.length === 0 && <p className="mt-3 text-center text-xs text-muted-foreground">Ainda não há resultados.</p>}
      {grupos.map((g) => {
        const lista = daAba.filter((l) => l.grupo === g).sort((a, b) => aba === "corrida" ? a.valor - b.valor : b.valor - a.valor);
        return (
          <div key={g} className="mt-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">{rotuloGrupo(g)}</p>
            <ol className="mt-1 space-y-1">
              {lista.map((l, i) => (
                <li key={i} className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${l.meu ? "border-primary bg-primary/10" : "border-border"}`}>
                  <span className="flex min-w-0 items-center gap-2"><b className="w-6 shrink-0">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}</b><span className="truncate">{l.aluno}</span></span>
                  <b className="tabular-nums">{fmt(Number(l.valor))}</b>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
