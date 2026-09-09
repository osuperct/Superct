import { Star } from "lucide-react";

import { TOTAL_ESTRELAS, faixaDaNota } from "@/lib/avaliacao";

/** Estrelas de 1 a 10. Sem onChange fica só para leitura. */
export function Estrelas({
  nota,
  onChange,
  rotulo,
}: {
  nota: number | undefined;
  onChange?: (n: number) => void;
  rotulo?: string;
}) {
  const faixa = nota ? faixaDaNota(nota) : null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from({ length: TOTAL_ESTRELAS }, (_, i) => i + 1).map((n) => {
        const ativa = (nota ?? 0) >= n;
        const classe = ativa ? (faixa?.classe ?? "text-primary") : "text-muted-foreground/40";
        if (!onChange) return <Star key={n} className={`size-3.5 ${classe}`} fill={ativa ? "currentColor" : "none"} />;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${rotulo ?? "Nota"}: ${n} de ${TOTAL_ESTRELAS}`}
            className="p-0.5"
          >
            <Star className={`size-5 ${classe}`} fill={ativa ? "currentColor" : "none"} />
          </button>
        );
      })}
      <span className="ml-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {nota ? `${nota}/10 · ${faixa?.rotulo}` : "sem nota"}
      </span>
    </div>
  );
}
