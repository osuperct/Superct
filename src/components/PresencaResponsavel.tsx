import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { MESES } from "@/lib/feriados";
import { diasDeAula, hojeDia, isoDia, type Presenca } from "@/lib/presenca";

type AlunoSimples = { id: string; nome: string };

export function PresencaResponsavel({ uid, alunos }: { uid: string; alunos: AlunoSimples[] }) {
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());

  const dias = useMemo(() => diasDeAula(ano, mes), [ano, mes]);
  const hoje = hojeDia();

  const carregar = useCallback(async () => {
    const inicio = isoDia(ano, mes, 1);
    const fim = isoDia(ano, mes, new Date(ano, mes, 0).getDate());
    const { data } = await supabase
      .from("presencas")
      .select("id, aluno_id, user_id, dia")
      .eq("user_id", uid)
      .gte("dia", inicio)
      .lte("dia", fim);
    setMarcadas(new Set(((data ?? []) as Presenca[]).map((p) => `${p.aluno_id}|${p.dia}`)));
  }, [ano, mes, uid]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function mudarMes(passo: number) {
    const d = new Date(ano, mes - 1 + passo, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  }

  if (alunos.length === 0) return null;

  return (
    <section className="mt-4 rounded-lg border border-border bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <ClipboardCheck className="size-4 text-primary" /> PRESENÇA DO ALUNO
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Chamada do mês, de segunda a sexta. Dia azul = presente. Dia vazio = falta.
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => mudarMes(-1)}
          aria-label="Mês anterior"
          className="rounded-md border border-border p-1.5 text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="font-display text-sm tracking-tight text-primary">
          {MESES[mes - 1]} {ano}
        </p>
        <button
          type="button"
          onClick={() => mudarMes(1)}
          aria-label="Próximo mês"
          className="rounded-md border border-border p-1.5 text-muted-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <ul className="mt-3 space-y-4">
        {alunos.map((a) => {
          const presentes = dias.filter((d) => marcadas.has(`${a.id}|${d.dia}`)).length;
          const uteis = dias.filter((d) => !d.feriado).length;
          return (
            <li key={a.id}>
              <p className="text-sm font-medium">{a.nome}</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {presentes} presença{presentes === 1 ? "" : "s"} • {Math.max(uteis - presentes, 0)} falta
                {uteis - presentes === 1 ? "" : "s"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {dias.map((d) => {
                  const presente = marcadas.has(`${a.id}|${d.dia}`);
                  return (
                    <span
                      key={d.dia}
                      title={d.feriado ?? undefined}
                      className={`flex size-7 flex-col items-center justify-center rounded border font-mono text-[9px] ${
                        presente
                          ? "border-secondary bg-secondary text-secondary-foreground"
                          : d.feriado
                            ? "border-primary/60 text-primary/70"
                            : "border-border text-muted-foreground"
                      } ${d.dia === hoje ? "ring-1 ring-primary" : ""}`}
                    >
                      {d.numero}
                    </span>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
