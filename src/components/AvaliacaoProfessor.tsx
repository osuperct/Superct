import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, ChevronLeft, Calendar, Download, Target, Trophy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Estrelas } from "@/components/Estrelas";
import { baixarBlob } from "@/lib/relatorioPdf";
import { relatorioAvaliacao } from "@/lib/avaliacaoPdf";
import {
  CRITERIOS,
  FAIXAS,
  CONQUISTAS_MANUAIS,
  type Avaliacao,
  type CriterioChave,
  type Notas,
  conquistasAutomaticas,
  lerNotas,
  mediaNotas,
  mesExtenso,
  metaDeNotas,
  referenciaMesAtual,
} from "@/lib/avaliacao";

type Alu = { id: string; nome: string; matricula: string | null; user_id: string };

const VAZIO: Notas = {};

function Resumo({ avaliacao }: { avaliacao: Avaliacao }) {
  const notas = lerNotas(avaliacao.notas);
  const media = mediaNotas(notas);
  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
        {mesExtenso(avaliacao.referencia)} · média {media.toFixed(1)}/10
      </p>
      <ul className="mt-2 space-y-2">
        {CRITERIOS.map((c) => (
          <li key={c.chave} className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{c.rotulo}</span>
            <Estrelas nota={notas[c.chave]} />
          </li>
        ))}
      </ul>
      <p className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-xs">
        <Target className="size-3 text-primary" /> Meta atual: {avaliacao.meta ?? metaDeNotas(notas) ?? "—"}
      </p>
      {(avaliacao.conquistas ?? []).length > 0 && (
        <p className="mt-1 flex items-center gap-1.5 text-xs">
          <Trophy className="size-3 text-primary" /> {(avaliacao.conquistas ?? []).join(" · ")}
        </p>
      )}
      {avaliacao.observacoes && <p className="mt-2 text-xs">{avaliacao.observacoes}</p>}
    </div>
  );
}

export function AvaliacaoProfessor({ alunos, professorId }: { alunos: Alu[]; professorId: string }) {
  const [sel, setSel] = useState<Alu | null>(null);

  if (sel) return <Ficha aluno={sel} professorId={professorId} voltar={() => setSel(null)} />;

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <ClipboardCheck className="size-4 text-primary" /> AVALIAÇÃO DO ALUNO
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Selecione o aluno para abrir a ficha individual e dar de 1 a 10 estrelas em cada aspecto. Todo dia 28, às
        20:00, o sistema publica automaticamente a avaliação do mês para os responsáveis dos alunos ativos.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {FAIXAS.map((f) => (
          <span key={f.rotulo} className={`font-mono text-[9px] uppercase tracking-widest ${f.classe}`}>
            {f.rotulo}: {f.ate === 3 ? "1 a 3" : f.ate === 6 ? "4 a 6" : "7 a 10"} estrelas
          </span>
        ))}
      </div>
      <div className="mt-3">
        <select
          value=""
          onChange={(e) => {
            const id = e.target.value;
            if (!id) return;
            const aluno = alunos.find((a) => a.id === id) ?? null;
            setSel(aluno);
            e.target.value = "";
          }}
          className="w-full max-w-full min-w-0 appearance-none truncate rounded-md border border-border bg-background px-3 py-3 text-sm"
        >
          <option value="">Selecione o aluno</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome} {a.matricula ? `— ${a.matricula}` : "— avaliar"}
            </option>
          ))}
        </select>
        {alunos.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Nenhum aluno matriculado ainda.</p>}
      </div>
    </section>
  );
}

function Ficha({ aluno, professorId, voltar }: { aluno: Alu; professorId: string; voltar: () => void }) {
  const referencia = referenciaMesAtual();
  const [notas, setNotas] = useState<Notas>(VAZIO);
  const [observacoes, setObservacoes] = useState("");
  const [manuais, setManuais] = useState<string[]>([]);
  const [anteriores, setAnteriores] = useState<Notas | null>(null);
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
    const anterior = lista.find((a) => a.referencia < referencia);
    setAnteriores(anterior ? lerNotas(anterior.notas) : null);
    const atual = lista.find((a) => a.referencia === referencia);
    if (atual) {
      setNotas(lerNotas(atual.notas));
      setObservacoes(atual.observacoes ?? "");
      setManuais((atual.conquistas ?? []).filter((c) => CONQUISTAS_MANUAIS.includes(c)));
    } else {
      setNotas(VAZIO);
      setObservacoes("");
      setManuais([]);
    }
  }, [aluno.id, referencia]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const media = mediaNotas(notas);

  async function salvar(publicar: boolean) {
    if (CRITERIOS.some((c) => !notas[c.chave])) {
      toast.error("Dê a nota em estrelas de todos os aspectos.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from("avaliacoes").upsert(
      {
        aluno_id: aluno.id,
        user_id: aluno.user_id,
        professor_id: professorId,
        referencia,
        observacoes: observacoes.trim() || null,
        notas: notas as Record<CriterioChave, number>,
        meta: metaDeNotas(notas),
        conquistas: [...new Set([...conquistasAutomaticas(notas, anteriores), ...manuais])],
        ...(publicar ? { publicada: true, publicada_em: new Date().toISOString() } : {}),
      },
      { onConflict: "aluno_id,referencia" },
    );
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar a avaliação.");
      return;
    }
    toast.success(
      publicar
        ? `Avaliação de ${mesExtenso(referencia)} publicada para o responsável.`
        : `Avaliação de ${mesExtenso(referencia)} salva.`,
    );
    void carregar();
  }

  async function baixar(avaliacao: Avaliacao) {
    try {
      const blob = await relatorioAvaliacao(aluno.nome, avaliacao, historico);
      baixarBlob(blob, `avaliacao-${aluno.nome.replace(/\s+/g, "-").toLowerCase()}-${avaliacao.referencia}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    }
  }

  const escolhida = historico.find((a) => a.referencia === mesSelecionado);

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
        Referência: {mesExtenso(referencia)} · média {media.toFixed(1)}/10
      </p>

      <ul className="mt-4 space-y-3">
        {CRITERIOS.map((c) => (
          <li key={c.chave} className="rounded-md border border-border bg-background/40 p-3">
            <p className="text-sm font-medium">{c.rotulo}</p>
            <div className="mt-1">
              <Estrelas
                nota={notas[c.chave]}
                rotulo={c.rotulo}
                onChange={(n) => setNotas((atual) => ({ ...atual, [c.chave]: n }))}
              />
            </div>
          </li>
        ))}
      </ul>

      <textarea
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
        rows={3}
        placeholder="Observação do professor (aparece no relatório da família)"
        className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={() => void salvar(false)}
        disabled={salvando}
        className="mt-3 w-full rounded-md bg-primary px-4 py-3 font-display text-sm tracking-tight text-primary-foreground disabled:opacity-60"
      >
        {salvando ? "SALVANDO…" : "SALVAR AVALIAÇÃO DO MÊS"}
      </button>
      <button
        type="button"
        onClick={() => void salvar(true)}
        disabled={salvando}
        className="mt-2 w-full rounded-md border border-primary px-4 py-3 font-display text-sm tracking-tight text-primary disabled:opacity-60"
      >
        PUBLICAR AGORA PARA O RESPONSÁVEL
      </button>

      <h3 className="mt-6 font-display text-sm tracking-tight">HISTÓRICO E RELATÓRIO</h3>
      {historico.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma avaliação registrada.</p>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="w-full max-w-full min-w-0 appearance-none truncate rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm"
            >
              <option value="">Selecione o mês</option>
              {historico.map((a) => (
                <option key={a.id} value={a.referencia}>
                  {mesExtenso(a.referencia)}
                </option>
              ))}
            </select>
          </div>
          {escolhida && (
            <>
              <Resumo avaliacao={escolhida} />
              <button
                type="button"
                onClick={() => void baixar(escolhida)}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Download className="size-3" /> BAIXAR RELATÓRIO EM PDF
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
