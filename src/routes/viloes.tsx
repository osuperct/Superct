import { createFileRoute } from "@tanstack/react-router";
import { Skull } from "lucide-react";

const TITLE = "Vilões do Super CT — Conheça os desafios | Professor Tio Victor";
const DESCRIPTION =
  "Conheça os vilões do Super CT: os personagens que desafiam as crianças nos treinos do Professor Tio Victor.";

export const Route = createFileRoute("/viloes")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  component: ViloesPage,
});

function ViloesPage() {
  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-md px-4 py-8">
        <h1 className="font-display text-4xl uppercase leading-none tracking-tighter">
          OS <span className="text-primary italic">VILÕES</span> DO SUPER CT
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Em breve os vilões chegam aqui com nome, poderes e o desafio que cada um traz para o treino.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card"
            >
              <Skull className="size-8 text-primary/60" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Vilão {i + 1}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
