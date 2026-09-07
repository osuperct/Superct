import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardCheck, Search } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { MESES } from "@/lib/feriados";
import { diasDeAula, hojeDia, isoDia, type Presenca } from "@/lib/presenca";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";

type AlunoChamada = { id: string; nome: string; user_id: string; matricula: string | null };

export function ListaChamada({
  alunos,
  professorId,
}: {
  alunos: AlunoChamada[];
  professorId: string;
}) {
  const agora = new Date();
  const [ano, setAno] = useState(agora.getFullYear());
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const dias = useMemo(() => diasDeAula(ano, mes), [ano, mes]);
  const hoje = hojeDia();

  const alunosOrdenados = useMemo(
    () =>
      [...alunos]
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
        .filter((a) => a.nome.toLowerCase().includes(busca.trim().toLowerCase())),
    [alunos, busca],
  );

  const carregar = useCallback(async () => {
    const inicio = isoDia(ano, mes, 1);
    const fim = isoDia(ano, mes, new Date(ano, mes, 0).getDate());
    const { data } = await supabase
      .from("presencas")
      .select("id, aluno_id, user_id, dia")
      .gte("dia", inicio)
      .lte("dia", fim);
    setMarcadas(new Set(((data ?? []) as Presenca[]).map((p) => `${p.aluno_id}|${p.dia}`)));
  }, [ano, mes]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function mudarMes(passo: number) {
    const d = new Date(ano, mes - 1 + passo, 1);
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  }

  async function alternar(aluno: AlunoChamada, dia: string) {
    const chave = `${aluno.id}|${dia}`;
    if (salvando) return;
    setSalvando(chave);
    const jaTem = marcadas.has(chave);
    if (jaTem) {
      const { error } = await supabase.from("presencas").delete().eq("aluno_id", aluno.id).eq("dia", dia);
      if (error) toast.error("Não foi possível desmarcar a presença.");
      else
        setMarcadas((s) => {
          const n = new Set(s);
          n.delete(chave);
          return n;
        });
    } else {
      const { error } = await supabase.from("presencas").insert({
        aluno_id: aluno.id,
        user_id: aluno.user_id,
        dia,
        professor_id: professorId,
      });
      if (error) toast.error("Não foi possível marcar a presença.");
      else setMarcadas((s) => new Set(s).add(chave));
    }
    setSalvando(null);
  }

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <ClipboardCheck className="size-4 text-primary" /> LISTA DE CHAMADA
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Alunos ativos do mês, de segunda a sexta. Toque no dia para marcar presença (fica azul). Dia sem
        toque conta como falta. Feriados aparecem em laranja.
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

      <Accordion type="single" collapsible className="mt-3">
        <AccordionItem value="lista" className="border-0">
          <AccordionTrigger className="py-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:no-underline hover:text-foreground">
            <span className="flex items-center gap-2">
              <ClipboardCheck className="size-3" />
              ABRIR LISTA COMPLETA ({alunosOrdenados.length})
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar aluno por nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-7 text-xs"
              />
            </div>

            {alunosOrdenados.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nenhum aluno ativo neste mês.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-max border-separate border-spacing-0 text-left">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-card px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        Aluno
                      </th>
                      {dias.map((d) => (
                        <th
                          key={d.dia}
                          title={d.feriado ?? undefined}
                          className={`px-1 py-1 text-center font-mono text-[9px] ${
                            d.feriado ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          <span className="block">{d.numero}</span>
                          <span className="block opacity-60">{d.semana}</span>
                        </th>
                      ))}
                      <th className="px-2 py-1 text-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        P/F
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunosOrdenados.map((a) => {
                      const presentes = dias.filter((d) => marcadas.has(`${a.id}|${d.dia}`)).length;
                      const uteis = dias.filter((d) => !d.feriado).length;
                      return (
                        <tr key={a.id}>
                          <th className="sticky left-0 z-10 max-w-[120px] truncate bg-card px-2 py-1 text-left text-xs font-medium">
                            {a.nome}
                          </th>
                          {dias.map((d) => {
                            const presente = marcadas.has(`${a.id}|${d.dia}`);
                            return (
                              <td key={d.dia} className="p-0.5">
                                <button
                                  type="button"
                                  onClick={() => void alternar(a, d.dia)}
                                  aria-label={`${a.nome} — dia ${d.numero}: ${presente ? "presente" : "falta"}`}
                                  className={`size-6 rounded border font-mono text-[9px] transition-colors ${
                                    presente
                                      ? "border-secondary bg-secondary text-secondary-foreground"
                                      : d.feriado
                                        ? "border-primary/60 text-primary/70"
                                        : "border-border text-muted-foreground"
                                  } ${d.dia === hoje ? "ring-1 ring-primary" : ""}`}
                                >
                                  {presente ? "P" : d.feriado ? "•" : ""}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-2 text-center font-mono text-[9px] text-muted-foreground">
                            {presentes}/{Math.max(uteis - presentes, 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Azul = presença • vazio = falta • laranja = feriado
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
