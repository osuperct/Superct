import { useEffect, useState } from "react";
import { ClipboardCheck, Calendar } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { CORES, CRITERIOS, type Avaliacao, classeCor, mesExtenso, rotuloCor } from "@/lib/avaliacao";


type Alu = { id: string; nome: string };

export function AvaliacaoResponsavel({ uid, alunos }: { uid: string; alunos: Alu[] }) {
  const [lista, setLista] = useState<Avaliacao[]>([]);

  useEffect(() => {
    let ativo = true;
    void supabase
      .from("avaliacoes")
      .select("*")
      .eq("user_id", uid)
      .order("referencia", { ascending: false })
      .then(({ data }) => {
        if (ativo) setLista((data ?? []) as unknown as Avaliacao[]);
      });
    return () => {
      ativo = false;
    };
  }, [uid]);

  return (
    <section className="mt-4 rounded-lg border border-border bg-card/40 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg tracking-tight">
        <ClipboardCheck className="size-4 text-primary" /> AVALIAÇÃO DO PROFESSOR
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Avaliação mensal feita pelo professor. Apenas para visualização.
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {CORES.map((c) => (
          <span key={c.cor} className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            <span className={`size-3 rounded-full ${c.classe}`} /> {c.rotulo}
          </span>
        ))}
      </div>

      <ul className="mt-3 space-y-2">
        {lista.map((a) => (
          <li key={a.id} className="rounded-md border border-border bg-background/40 p-3">
            <p className="text-sm font-medium">
              {alunos.find((al) => al.id === a.aluno_id)?.nome ?? "Aluno"}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">{mesExtenso(a.referencia)}</p>
            <div className="mt-2 space-y-1">
              {CRITERIOS.map((c) => (
                <div key={c.chave} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2">
                    <span className={`size-3 shrink-0 rounded-full ${classeCor(a[c.chave])}`} />
                    <span className="text-muted-foreground">{c.rotulo}</span>
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    {rotuloCor(a[c.chave])}
                  </span>
                </div>
              ))}
            </div>
            {a.observacoes && <p className="mt-2 text-xs">{a.observacoes}</p>}
          </li>
        ))}
        {lista.length === 0 && (
          <li className="text-sm text-muted-foreground">Nenhuma avaliação disponível ainda.</li>
        )}
      </ul>
    </section>
  );
}
