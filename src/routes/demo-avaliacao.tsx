import { createFileRoute } from "@tanstack/react-router";

import { AvaliacaoResponsavel } from "@/components/AvaliacaoResponsavel";
import { CRITERIOS, type Avaliacao } from "@/lib/avaliacao";

export const Route = createFileRoute("/demo-avaliacao")({
  component: Demo,
  head: () => ({
    meta: [
      { title: "Exemplo de avaliação — Super CT" },
      { name: "description", content: "Prévia da ficha mensal de avaliação do aluno no Super CT." },
      { property: "og:title", content: "Exemplo de avaliação — Super CT" },
      { property: "og:description", content: "Prévia da ficha mensal de avaliação do aluno no Super CT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const notas = Object.fromEntries(CRITERIOS.map((c) => [c.chave, 7]));

const exemplo = {
  id: "demo-1",
  aluno_id: "aluno-demo",
  user_id: "demo",
  referencia: "2026-09-28",
  observacoes:
    "Pedrinho treinou com muita vontade neste mês! Já melhorou o equilíbrio nas argolas e ajudou os colegas nos circuitos.",
  notas,
  meta: "Força e resistência",
  conquistas: ["🎯 Parceiro de Equipe", "📈 Evolução em Coordenação motora"],
  publicada: true,
} as unknown as Avaliacao;

function Demo() {
  return (
    <main className="mx-auto max-w-md px-3 py-6">
      <h1 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Exemplo de avaliação</h1>
      <AvaliacaoResponsavel uid="demo" alunos={[{ id: "aluno-demo", nome: "Pedrinho Exemplo" }]} demo={[exemplo]} />
    </main>
  );
}
