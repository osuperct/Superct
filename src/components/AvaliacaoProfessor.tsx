import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, ChevronLeft, Calendar } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  CORES,
  CRITERIOS,
  type Avaliacao,
  type Cor,
  type CriterioChave,
  classeCor,
  mesExtenso,
  referenciaMesAtual,
} from "@/lib/avaliacao";


type Alu = { id: string; nome: string; matricula: string | null; user_id: string };

function VisualizarAvaliacao({ avaliacao }: { avaliacao: Avaliacao }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <ul className="space-y-2">
        {CRITERIOS.map((c) => (
          <li key={c.chave} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{c.rotulo}</span>
            <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              <span className={`size-3 rounded-full ${classeCor(avaliacao[c.chave])}`} />
              {CORES.find((x) => x.cor === avaliacao[c.chave])?.rotulo}
            </span>
          </li>
        ))}
      </ul>
      {avaliacao.observacoes && <p className="mt-2 border-t border-border pt-2 text-xs">{avaliacao.observacoes}</p>}
    </div>
  );
}

const VAZIO: Record<CriterioChave, Cor> = {

  coordenacao_motora: "amarelo",
  forca_resistencia: "amarelo",
  velocidade_agilidade: "amarelo",
  respeito_empatia: "amarelo",
  disciplina: "amarelo",
  comportamento: "amarelo",
  execucao_exercicios: "amarelo",
};

export function AvaliacaoProfessor({ alunos, professorId }: { alunos: Alu[]; professorId: string }) {
  const [sel, setSel] = useState<Alu | null>(null);

  if (sel) return <Ficha aluno={sel} professorId={professorId} voltar={() => setSel(null)} />;

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <ClipboardCheck className="size-4 text-primary" /> AVALIAÇÃO DO ALUNO
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Clique no nome do aluno para abrir a ficha individual. A avaliação do mês vigente fica disponível para o
        responsável apenas para visualização.
      </p>
      <ul className="mt-3 space-y-2">
        {alunos.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setSel(a)}
              className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background/40 p-3 text-left hover:border-primary"
            >
              <span className="text-sm font-medium">{a.nome}</span>
              <span className="shrink-0 rounded border border-primary/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-primary">
                {a.matricula ?? "avaliar"}
              </span>
            </button>
          </li>
        ))}
        {alunos.length === 0 && <li className="text-sm text-muted-foreground">Nenhum aluno matriculado ainda.</li>}
      </ul>
    </section>
  );
}

function Ficha({ aluno, professorId, voltar }: { aluno: Alu; professorId: string; voltar: () => void }) {
  const referencia = referenciaMesAtual();
  const [notas, setNotas] = useState<Record<CriterioChave, Cor>>(VAZIO);
  const [observacoes, setObservacoes] = useState("");
  const [historico, setHistorico] = useState<Avaliacao[]>([]);
  const [mesSelecionado, setMesSelecionado] = useState<string>("");
  const [salvando, setSalvando] = useState(false);


  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from("avaliacoes")
      .select("*")
      .eq("aluno_id", aluno.id)
      .order("referencia", { ascending: false });
    const lista = (data ?? []) as unknown as Avaliacao[];
    setHistorico(lista);
    const atual = lista.find((a) => a.referencia === referencia);
    if (atual) {
      const novo = { ...VAZIO };
      for (const c of CRITERIOS) novo[c.chave] = (atual[c.chave] as Cor) ?? "amarelo";
      setNotas(novo);
      setObservacoes(atual.observacoes ?? "");
    } else {
      setNotas(VAZIO);
      setObservacoes("");
    }
  }, [aluno.id, referencia]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar() {
    setSalvando(true);
    const { error } = await supabase.from("avaliacoes").upsert(
      {
        aluno_id: aluno.id,
        user_id: aluno.user_id,
        professor_id: professorId,
        referencia,
        observacoes: observacoes.trim() || null,
        ...notas,
      },
      { onConflict: "aluno_id,referencia" },
    );
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar a avaliação.");
      return;
    }
    toast.success(`Avaliação de ${mesExtenso(referencia)} salva.`);
    void carregar();
  }

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <button
        type="button"
        onClick={voltar}
        className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground"
      >
        <ChevronLeft className="size-3" /> Alunos
      </button>
      <h2 className="mt-2 font-display text-lg tracking-tight">
        FICHA DE <span className="text-primary">{aluno.nome.toUpperCase()}</span>
      </h2>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Referência: {mesExtenso(referencia)}
      </p>

      <ul className="mt-4 space-y-3">
        {CRITERIOS.map((c) => (
          <li key={c.chave} className="rounded-md border border-border bg-background/40 p-3">
            <p className="text-sm font-medium">{c.rotulo}</p>
            <div className="mt-2 flex gap-2">
              {CORES.map((cor) => (
                <button
                  key={cor.cor}
                  type="button"
                  onClick={() => setNotas((n) => ({ ...n, [c.chave]: cor.cor }))}
                  aria-label={`${c.rotulo}: ${cor.rotulo}`}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest ${
                    notas[c.chave] === cor.cor
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <span className={`size-3 rounded-full ${cor.classe}`} />
                  {cor.rotulo}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <textarea
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
        rows={3}
        placeholder="Observações do professor (opcional)"
        className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={() => void salvar()}
        disabled={salvando}
        className="mt-3 w-full rounded-md bg-primary px-4 py-3 font-display text-sm tracking-tight text-primary-foreground disabled:opacity-60"
      >
        {salvando ? "SALVANDO…" : "SALVAR AVALIAÇÃO DO MÊS"}
      </button>

      <h3 className="mt-6 font-display text-sm tracking-tight">HISTÓRICO</h3>
      <ul className="mt-2 space-y-2">
        {historico.map((a) => (
          <li key={a.id} className="rounded-md border border-border bg-background/40 p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">{mesExtenso(a.referencia)}</p>
            <div className="mt-2 space-y-1">
              {CRITERIOS.map((c) => (
                <div key={c.chave} className="flex items-center gap-2 text-xs">
                  <span className={`size-3 shrink-0 rounded-full ${classeCor(a[c.chave])}`} />
                  <span className="text-muted-foreground">{c.rotulo}</span>
                </div>
              ))}
            </div>
            {a.observacoes && <p className="mt-2 text-xs">{a.observacoes}</p>}
          </li>
        ))}
        {historico.length === 0 && <li className="text-sm text-muted-foreground">Nenhuma avaliação registrada.</li>}
      </ul>
    </section>
  );
}
