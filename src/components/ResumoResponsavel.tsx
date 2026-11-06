import { useEffect, useState } from "react";
import { BellRing, CalendarClock, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { formatarDataIso, formatarValor } from "@/lib/mensalidade";
import { lerNotas, mediaNotas, mesExtenso } from "@/lib/avaliacao";
import type { ResumoMensalidade } from "@/components/MensalidadeResponsavel";

const COR: Record<string, string> = {
  "EM DIA": "text-emerald-400",
  "EM ATRASO": "text-destructive",
  "A VENCER": "text-primary",
};

export function ResumoResponsavel({
  uid,
  mensalidades,
  avisosNaoLidos,
}: {
  uid: string;
  mensalidades: ResumoMensalidade[];
  avisosNaoLidos: number;
}) {
  const [ultima, setUltima] = useState<{ referencia: string; media: number } | null>(null);

  useEffect(() => {
    void supabase
      .from("avaliacoes")
      .select("referencia, notas")
      .eq("user_id", uid)
      .eq("publicada", true)
      .order("referencia", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const a = data?.[0];
        setUltima(a ? { referencia: a.referencia, media: mediaNotas(lerNotas(a.notas)) } : null);
      });
  }, [uid]);

  if (mensalidades.length === 0 && !ultima && avisosNaoLidos === 0) return null;

  return (
    <div className="rounded-md border-2 border-primary/50 bg-card/60 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Resumo</p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {mensalidades.map((m) => (
          <li key={m.nome} className="flex items-start gap-2">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="font-display">{m.nome.split(" ")[0]}</span>:{" "}
              <span className={`font-display ${COR[m.situacao ?? ""] ?? "text-muted-foreground"}`}>{m.situacao ?? "sem mensalidade lançada"}</span>
              {m.situacao !== "EM DIA" && (
                <span className="text-muted-foreground"> · vence {formatarDataIso(m.venc)}{m.valor ? ` · ${formatarValor(m.valor)}` : ""}</span>
              )}
            </span>
          </li>
        ))}
        {ultima && (
          <li className="flex items-center gap-2">
            <Star className="size-4 shrink-0 text-primary" />
            <span>Última avaliação ({mesExtenso(ultima.referencia)}): média <b>{ultima.media.toFixed(1)}</b></span>
          </li>
        )}
        <li className="flex items-center gap-2">
          <BellRing className="size-4 shrink-0 text-primary" />
          <span>{avisosNaoLidos > 0 ? `${avisosNaoLidos} recado(s) novo(s) no Quadro de Avisos` : "Nenhum recado novo"}</span>
        </li>
      </ul>
    </div>
  );
}
