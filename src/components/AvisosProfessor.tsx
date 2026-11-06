import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ImagePlus, Megaphone, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { type Aviso, agruparPorMes, dataCurta, enviarAviso, excluirAviso, listarAvisos } from "@/lib/avisos";

type AlunoAviso = { id: string; nome: string; idade: number | null };
type Turma = { turma: string; idade: string; horario: string };

export function AvisosProfessor({ uid, alunos = [] }: { uid: string; alunos?: AlunoAviso[] }) {
  const [paraTodos, setParaTodos] = useState(true);
  const [destino, setDestino] = useState<Set<string>>(new Set());
  const [turmas, setTurmas] = useState<Turma[]>([]);
  useEffect(() => {
    void supabase.from("turmas_app").select("turma, idade, horario").order("ordem").then(({ data }) => setTurmas((data ?? []) as Turma[]));
  }, []);
  function porTurma(t: Turma) {
    const [min, max] = (t.idade.match(/\d+/g) ?? []).map(Number);
    if (min === undefined) return;
    setDestino(new Set(alunos.filter((a) => a.idade !== null && a.idade >= min && a.idade <= (max ?? min)).map((a) => a.id)));
  }
  function alternarAluno(id: string) {
    setDestino((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  const [lista, setLista] = useState<Aviso[]>([]);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [imagem, setImagem] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  function escolherImagem(file: File | null) {
    if (previa) URL.revokeObjectURL(previa);
    setImagem(file);
    setPrevia(file ? URL.createObjectURL(file) : null);
  }

  const carregar = useCallback(async () => {
    setLista(await listarAvisos());
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function enviar() {
    if (!titulo.trim() || !mensagem.trim()) {
      toast.error("Escreva o título e a mensagem do aviso.");
      return;
    }
    if (!paraTodos && destino.size === 0) {
      toast.error("Escolha pelo menos um aluno para receber o aviso.");
      return;
    }
    setEnviando(true);
    try {
      await enviarAviso(uid, titulo, mensagem, imagem, paraTodos ? null : [...destino]);
      setTitulo("");
      setMensagem("");
      escolherImagem(null);
      await carregar();
      toast.success(paraTodos ? "Aviso enviado para todos os responsáveis." : `Aviso enviado para ${destino.size} aluno(s).`);
      setDestino(new Set());
    } catch {
      toast.error("Não foi possível enviar o aviso.");
    } finally {
      setEnviando(false);
    }
  }

  async function remover(id: string) {
    try {
      await excluirAviso(id);
      setLista((atual) => atual.filter((a) => a.id !== id));
    } catch {
      toast.error("Não foi possível excluir o aviso.");
    }
  }

  function toggleMes(chave: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });
  }

  const porMes = agruparPorMes(lista);

  return (
    <section className="mt-4 rounded-lg border border-border bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <Megaphone className="size-4 text-primary" /> QUADRO DE AVISOS
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Envie para todos os responsáveis ou só para uma turma ou alunos escolhidos.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setParaTodos(true)} className={`rounded-md border px-3 py-2 font-display text-xs ${paraTodos ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>PARA TODOS</button>
        <button type="button" onClick={() => setParaTodos(false)} className={`rounded-md border px-3 py-2 font-display text-xs ${!paraTodos ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>TURMA / ALUNOS</button>
      </div>
      {!paraTodos && (
        <div className="mt-2 rounded-md border border-border bg-background/40 p-2">
          <div className="flex flex-wrap gap-1.5">
            {turmas.map((t) => (
              <button key={t.turma} type="button" onClick={() => porTurma(t)} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary">
                Turma {t.turma} ({t.idade})
              </button>
            ))}
            <button type="button" onClick={() => setDestino(new Set())} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">Limpar</button>
          </div>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{destino.size} selecionado(s) — toque para ajustar</p>
          <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto">
            {alunos.map((a) => (
              <li key={a.id}>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={destino.has(a.id)} onChange={() => alternarAluno(a.id)} />
                  {a.nome}{a.idade !== null ? ` (${a.idade})` : ""}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título do aviso"
        maxLength={80}
        className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <textarea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        placeholder="Escreva a mensagem para os responsáveis"
        rows={4}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="mt-2 flex items-center gap-2">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 font-display text-xs tracking-tight text-muted-foreground">
          <ImagePlus className="size-4" /> {imagem ? "TROCAR FOTO" : "ANEXAR FOTO"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => escolherImagem(e.target.files?.[0] ?? null)}
          />
        </label>
        {previa && (
          <button
            type="button"
            onClick={() => escolherImagem(null)}
            aria-label="Remover foto"
            className="shrink-0 rounded-md border border-border p-2 text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {previa && (
        <img
          src={previa}
          alt="Prévia da foto do aviso"
          className="mt-2 max-h-48 w-full rounded-md border border-border object-contain"
        />
      )}

      <button
        type="button"
        disabled={enviando}
        onClick={() => void enviar()}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-display text-sm tracking-tight text-primary-foreground disabled:opacity-60"
      >
        {enviando ? "ENVIANDO..." : paraTodos ? "ENVIAR AVISO PARA TODOS" : `ENVIAR PARA ${destino.size} ALUNO(S)`} <Send className="size-4 shrink-0" />
      </button>

      {lista.length > 0 && (
        <div className="mt-3 max-h-[360px] space-y-2 overflow-y-auto rounded-md border border-border bg-background/20 p-2">
          {porMes.map((grupo) => {
            const aberto = abertos.has(grupo.chave);
            return (
              <div key={grupo.chave} className="rounded-md border border-border bg-background/40">
                <button
                  type="button"
                  onClick={() => toggleMes(grupo.chave)}
                  className="flex w-full items-center justify-between gap-2 p-3 text-left"
                  aria-expanded={aberto}
                >
                  <span className="font-display text-sm tracking-tight">{grupo.rotulo}</span>
                  {aberto ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </button>
                {aberto && (
                  <ul className="space-y-2 border-t border-border px-3 pb-3 pt-2">
                    {grupo.avisos.map((a) => (
                      <li key={a.id} className="rounded-md border border-border bg-background/60 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display text-sm tracking-tight">{a.titulo}{a.alunos_destino ? <span className="ml-2 font-mono text-[9px] text-primary">TURMA</span> : null}</p>
                          <button
                            type="button"
                            onClick={() => void remover(a.id)}
                            aria-label="Excluir aviso"
                            className="shrink-0 rounded-md border border-border p-1 text-muted-foreground"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.mensagem}</p>
                        {a.imagem && (
                          <img
                            src={a.imagem}
                            alt={`Foto do aviso ${a.titulo}`}
                            loading="lazy"
                            className="mt-2 max-h-56 w-full rounded-md border border-border object-contain"
                          />
                        )}
                        <span className="mt-1 block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                          {dataCurta(a.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
