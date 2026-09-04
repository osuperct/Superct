import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronUp } from "lucide-react";

const TITLE = "Super Jogo — Super CT | Professor Tio Victor";
const DESCRIPTION =
  "Jogue o mini game do Super CT direto no celular: mova para os lados e pule com os controles na tela.";

export const Route = createFileRoute("/jogo")({
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
  component: JogoPage,
});

const GRAVIDADE = -1.6;
const IMPULSO = 20;
const VELOCIDADE = 3.2;

function JogoPage() {
  const [x, setX] = useState(50);
  const [y, setY] = useState(0);
  const dir = useRef(0);
  const vy = useRef(0);
  const noAr = useRef(false);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (dir.current !== 0) {
        setX((prev) => Math.min(92, Math.max(4, prev + dir.current * VELOCIDADE)));
      }
      if (noAr.current) {
        vy.current += GRAVIDADE;
        setY((prev) => {
          const next = prev + vy.current;
          if (next <= 0) {
            noAr.current = false;
            vy.current = 0;
            return 0;
          }
          return next;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pular = () => {
    if (noAr.current) return;
    noAr.current = true;
    vy.current = IMPULSO;
  };

  const mover = (valor: number) => () => {
    dir.current = valor;
  };
  const parar = () => {
    dir.current = 0;
  };

  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-md px-4 py-8">
        <h1 className="font-display text-4xl uppercase leading-none tracking-tighter">
          SUPER <span className="text-primary italic">JOGO</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use os controles na tela para mover e pular. Em breve: fases, vilões e pontuação.
        </p>

        <div className="relative mt-6 h-64 overflow-hidden rounded-lg border border-border bg-card">
          <div className="absolute inset-x-0 bottom-0 h-10 border-t border-primary/40 bg-primary/10" />
          <div
            className="absolute size-10 rounded-md border-2 border-primary bg-primary/30 transition-transform"
            style={{ left: `${x}%`, bottom: `${40 + y}px` }}
            aria-label="Personagem"
          />
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="flex gap-3">
            <ControlButton onStart={mover(-1)} onEnd={parar} label="Mover para a esquerda">
              <ArrowLeft className="size-7" />
            </ControlButton>
            <ControlButton onStart={mover(1)} onEnd={parar} label="Mover para a direita">
              <ArrowRight className="size-7" />
            </ControlButton>
          </div>
          <ControlButton onStart={pular} label="Pular">
            <ChevronUp className="size-7" />
          </ControlButton>
        </div>
      </main>
    </div>
  );
}

function ControlButton({
  children,
  onStart,
  onEnd,
  label,
}: {
  children: React.ReactNode;
  onStart: () => void;
  onEnd?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onStart}
      onPointerUp={onEnd}
      onPointerLeave={onEnd}
      onPointerCancel={onEnd}
      className="flex size-16 select-none touch-none items-center justify-center rounded-full border border-border bg-card text-primary active:scale-95 active:bg-primary/20"
    >
      {children}
    </button>
  );
}
