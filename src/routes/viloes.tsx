import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2 } from "lucide-react";
import { VILOES } from "@/data/viloes";

const TITLE = "Vilões do Super CT — Conheça os desafios | Professor Tio Victor";
const DESCRIPTION =
  "Conheça os vilões do Super CT: Lorde Lag, Sonekão, Choralina, Tropecildo, Doceman e Respondão — os inimigos que as crianças derrotam no treino.";

export const Route = createFileRoute("/viloes")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
          Cada vilão representa um hábito que atrapalha as crianças. No treino, a gente derrota todos eles.
        </p>

        <Link
          to="/jogo"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary bg-primary/15 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary"
        >
          <Gamepad2 className="size-4" /> Enfrentar no jogo
        </Link>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {VILOES.map((v) => (
            <article
              key={v.nome}
              className="overflow-hidden rounded-xl border border-border bg-card"
              style={{ boxShadow: `0 0 24px -12px ${v.cor}` }}
            >
              <div className="bg-black">
                <img
                  src={v.img}
                  alt={`${v.nome} — vilão do Super CT que representa ${v.poder}`}
                  loading="lazy"
                  className="h-auto w-full object-contain"
                />
              </div>
              <div className="p-4">
                <h2
                  className="font-display text-2xl uppercase leading-none tracking-tight"
                  style={{ color: v.cor }}
                >
                  {v.nome}
                </h2>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {v.poder}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
