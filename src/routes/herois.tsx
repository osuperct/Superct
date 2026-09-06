import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2 } from "lucide-react";
import { HEROIS } from "@/data/herois";

const TITLE = "Heróis Miah e Kal-El — Super CT | Professor Tio Victor";
const DESCRIPTION =
  "Conheça Miah e Kal-El, os heróis do Super CT: em pose de herói, prontos para encarar os vilões da academia em cada fase do Super Jogo.";

export const Route = createFileRoute("/herois")({
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
  component: HeroisPage,
});

function HeroisPage() {
  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-md px-4 py-8">
        <h1 className="font-display text-4xl uppercase leading-none tracking-tighter">
          NOSSOS <span className="text-primary italic">HERÓIS</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Miah e Kal-El treinam no Super CT e enfrentam os vilões que atrapalham a saúde das crianças.
          Escolha o seu antes de começar o jogo.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {HEROIS.map((h) => (
            <article
              key={h.id}
              className="overflow-hidden rounded-lg border border-border bg-card p-3 text-center animate-reveal"
              style={{ boxShadow: `0 0 26px -14px ${h.cor}` }}
            >
              <div
                className="flex h-48 items-end justify-center rounded-md"
                style={{ background: `radial-gradient(circle at 50% 85%, ${h.cor}33, transparent 70%)` }}
              >
                <img
                  src={h.img}
                  alt={`${h.nome} em pose de herói`}
                  className="h-48 w-auto object-contain"
                  style={{ filter: `drop-shadow(0 0 14px ${h.cor})` }}
                />
              </div>
              <h2 className="mt-2 font-display text-xl uppercase tracking-tight" style={{ color: h.cor }}>
                {h.nome}
              </h2>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{h.poder}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{h.descricao}</p>
            </article>
          ))}
        </div>

        <Link
          to="/jogo"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary bg-primary/15 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary"
        >
          <Gamepad2 className="size-4" /> Jogar com Miah ou Kal-El
        </Link>
      </main>
    </div>
  );
}
