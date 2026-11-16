import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Timer, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { TrofeuColorido } from "@/components/AvaliacaoEmblemas";
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
} from "@/lib/avaliacaoSuper";

type Alu = { id: string; nome: string; user_id: string };

function Cronometro({ aoParar, rotulo = "PARAR E GRAVAR" }: { aoParar: (ms: number) => void; rotulo?: string }) {
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
  const ms = inicio !== null ? agora - inicio : (final ?? 0);
  return (
    <div className="rounded-md border border-border bg-background/60 p-3 text-center">
      <p className="font-mono text-3xl tabular-nums text-primary">{formatarTempo(ms)}</p>
      {inicio === null ? (
        <button type="button" onClick={() => { const t = Date.now(); setInicio(t); setAgora(t); setFinal(null); }} className="mt-2 w-full rounded-md bg-primary px-4 py-3 font-display text-sm text-primary-foreground">
          {final === null ? "INICIAR" : "REINICIAR"}
        </button>
      ) : (
        <button type="button" onClick={() => { const t = Date.now() - inicio; setInicio(null); setFinal(t); aoParar(t); }} className="mt-2 w-full rounded-md bg-destructive px-4 py-3 font-display text-sm text-destructive-foreground">
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

function Topico({ titulo, icone, children, inicial = false }: { titulo: string; icone: React.ReactNode; children: React.ReactNode; inicial?: boolean }) {
  const [aberto, setAberto] = useState(inicial);
  return (
    <div className="mt-3 rounded-md border border-border bg-background/40">
      <button type="button" onClick={() => setAberto((v) => !v)} className="flex w-full items-center justify-between gap-2 px-3 py-3 font-display text-sm">
        <span className="flex items-center gap-2">{icone} {titulo}</span>
        <ChevronDown className={`size-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}

export function HistoricoSuper({ registros }: { registros: RegistroSuper[] }) {
  const tafs = registros.filter((r) => r.tipo === "taf").sort((a, b) => a.ano - b.ano);
  const corridas = registros
    .filter((r) => r.tipo === "corrida")
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((r) => ({ r, c: lerCorrida(r.dados) }))
    .filter((x) => x.c);
  if (registros.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma avaliação Super ainda.</p>;
  return (
    <div className="space-y-4">
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
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">SUPER CORRIDA</p>
          <ul className="mt-1 space-y-1 text-xs">
            {corridas.slice().reverse().map(({ r, c }) => (
              <li key={r.id} className="flex justify-between gap-2 border-b border-border/50 py-1">
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                <span>{formatarTempo(c!.tempo_ms)} · {c!.voltas} volta(s)</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={corridas.map(({ r, c }) => ({ dia: new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), seg: Math.round(c!.tempo_ms / 100) / 10, voltas: c!.voltas }))}>
                <XAxis dataKey="dia" fontSize={10} /><YAxis fontSize={10} width={28} /><Tooltip />
                <Line dataKey="seg" name="Tempo (s)" stroke="var(--primary)" strokeWidth={2} />
                <Line dataKey="voltas" name="Voltas" stroke="var(--evaluation-orange)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
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
  const aluno = alunos.find((a) => a.id === alunoId) ?? null;
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
    toast.success(`TAF ${ano} salvo — ${trofeusTaf(dados)} troféus de ouro!`);
    void carregar(aluno.id);
  }

  async function salvarCorrida(ms: number) {
    if (!aluno) return;
    const { error } = await supabase.from("avaliacoes_super").insert({ aluno_id: aluno.id, user_id: aluno.user_id, professor_id: professorId, tipo: "corrida", ano, dados: { tempo_ms: ms, voltas } });
    if (error) { toast.error("Não foi possível gravar a corrida."); return; }
    toast.success(`Corrida gravada: ${formatarTempo(ms)} · ${voltas} volta(s)`);
    void carregar(aluno.id);
  }

  return (
    <div className="mt-4 rounded-lg border border-primary/40 bg-background/40 p-3">
      <h3 className="flex items-center gap-2 font-display text-base tracking-tight"><Zap className="size-4 text-primary" /> ÁREA SUPER</h3>
      <p className="mt-1 text-xs text-muted-foreground">Somente alunos ativos. Os resultados aparecem automaticamente na avaliação do aluno para o responsável.</p>
      <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)} className="mt-2 w-full min-w-0 truncate rounded-md border border-border bg-background px-3 py-3 text-sm">
        <option value="">Selecione o aluno ativo</option>
        {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>
      {aluno && (
        <>
          <Topico titulo={`TAF SUPER CT ${ano}`} icone={<Trophy className="size-4 text-primary" />}>
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
          </Topico>
          <Topico titulo="SUPER CORRIDA" icone={<Timer className="size-4 text-primary" />}>
            <p className="text-xs text-muted-foreground">Escolha as voltas (1 a 10), inicie e, ao parar, a corrida é gravada na hora.</p>
            <Voltas valor={voltas} onChange={setVoltas} />
            <div className="mt-2"><Cronometro aoParar={(ms) => void salvarCorrida(ms)} /></div>
          </Topico>
          <Topico titulo="HISTÓRICO E GRÁFICO" icone={<Zap className="size-4 text-primary" />}>
            <HistoricoSuper registros={registros} />
          </Topico>
        </>
      )}
    </div>
  );
}

export function SuperResponsavel({ uid, alunos }: { uid: string; alunos: { id: string; nome: string }[] }) {
  const [registros, setRegistros] = useState<RegistroSuper[]>([]);
  const [alunoId, setAlunoId] = useState(alunos[0]?.id ?? "");
  useEffect(() => {
    if (uid === "demo") return;
    void supabase.from("avaliacoes_super").select("*").eq("user_id", uid).order("created_at").then(({ data }) => setRegistros((data ?? []) as RegistroSuper[]));
  }, [uid]);
  const comDados = alunos.filter((a) => registros.some((r) => r.aluno_id === a.id));
  if (comDados.length === 0) return null;
  const atual = comDados.find((a) => a.id === alunoId) ?? comDados[0]!;
  return (
    <div className="border-t border-evaluation-blue/20 p-4">
      <h4 className="flex items-center gap-2 font-display text-base"><Zap className="size-4 text-primary" /> ÁREA SUPER · TAF E CORRIDA</h4>
      {comDados.length > 1 && (
        <select value={atual.id} onChange={(e) => setAlunoId(e.target.value)} className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
          {comDados.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      )}
      <div className="mt-3"><HistoricoSuper registros={registros.filter((r) => r.aluno_id === atual.id)} /></div>
    </div>
  );
}
