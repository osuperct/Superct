import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronUp, RotateCcw } from "lucide-react";
import mascote from "@/assets/mascote-menino.jpg.asset.json";
import { VILOES } from "@/data/viloes";

const TITLE = "Super Jogo — Derrote os vilões do Super CT | Professor Tio Victor";
const DESCRIPTION =
  "Jogue o mini game do Super CT no celular: pule sobre Lorde Lag, Sonekão, Choralina, Tropecildo, Doceman e Respondão com os controles na tela.";

export const Route = createFileRoute("/jogo")({
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
  component: JogoPage,
});

const GRAVIDADE = -1.4;
const IMPULSO = 18;
const VELOCIDADE = 1.6;
const CHAO = 40;
const ALTURA_HEROI = 44;

type Inimigo = { id: number; x: number; vilao: number; bob: number };

function JogoPage() {
  const [x, setX] = useState(12);
  const [y, setY] = useState(0);
  const [inimigos, setInimigos] = useState<Inimigo[]>([]);
  const [pontos, setPontos] = useState(0);
  const [fim, setFim] = useState(false);
  const [derrotado, setDerrotado] = useState<number | null>(null);

  const dir = useRef(0);
  const vy = useRef(0);
  const noAr = useRef(false);
  const xRef = useRef(12);
  const yRef = useRef(0);
  const fimRef = useRef(false);
  const nextId = useRef(0);
  const spawn = useRef(0);
  const tick = useRef(0);

  const reiniciar = useCallback(() => {
    dir.current = 0;
    vy.current = 0;
    noAr.current = false;
    xRef.current = 12;
    yRef.current = 0;
    fimRef.current = false;
    nextId.current = 0;
    spawn.current = 0;
    tick.current = 0;
    setX(12);
    setY(0);
    setInimigos([]);
    setPontos(0);
    setDerrotado(null);
    setFim(false);
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (fimRef.current) return;
      tick.current += 1;

      if (dir.current !== 0) {
        xRef.current = Math.min(88, Math.max(2, xRef.current + dir.current * VELOCIDADE));
        setX(xRef.current);
      }

      if (noAr.current) {
        vy.current += GRAVIDADE;
        let next = yRef.current + vy.current;
        if (next <= 0) {
          next = 0;
          noAr.current = false;
          vy.current = 0;
        }
        yRef.current = next;
        setY(next);
      }

      spawn.current -= 1;
      if (spawn.current <= 0) {
        spawn.current = 90 + Math.floor(Math.random() * 70);
        const vilao = Math.floor(Math.random() * VILOES.length);
        setInimigos((prev) => [...prev, { id: nextId.current++, x: 104, vilao, bob: 0 }]);
      }

      setInimigos((prev) => {
        const velocidade = 0.7 + Math.min(0.9, tick.current / 4000);
        const next: Inimigo[] = [];
        for (const i of prev) {
          const nx = i.x - velocidade;
          if (nx < -14) {
            setPontos((p) => p + 1);
            continue;
          }
          if (Math.abs(nx - xRef.current) < 7 && yRef.current < ALTURA_HEROI * 0.6) {
            fimRef.current = true;
            setFim(true);
            setDerrotado(i.vilao);
          }
          next.push({ ...i, x: nx, bob: i.bob + 0.08 });
        }
        return next;
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pular = () => {
    if (fimRef.current || noAr.current) return;
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
          Pule sobre os vilões do Super CT. Cada vilão que passa por baixo do seu pulo vale 1 ponto.
        </p>

        <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>
            Pontos: <span className="text-primary">{pontos}</span>
          </span>
          <button
            type="button"
            onClick={reiniciar}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-primary"
          >
            <RotateCcw className="size-3" /> Reiniciar
          </button>
        </div>

        <div className="relative mt-3 h-64 overflow-hidden rounded-lg border border-border bg-gradient-to-b from-card to-black">
          <div className="absolute inset-x-0 bottom-0 h-10 border-t border-primary/40 bg-primary/10" />

          <img
            src={mascote.url}
            alt="Herói do Super CT"
            className="absolute size-11 rounded-full border-2 border-primary object-cover"
            style={{ left: `${x}%`, bottom: `${CHAO + y}px` }}
          />

          {inimigos.map((i) => (
            <img
              key={i.id}
              src={VILOES[i.vilao]!.img}
              alt={VILOES[i.vilao]!.nome}
              className="absolute h-14 w-14 object-contain"
              style={{
                left: `${i.x}%`,
                bottom: `${CHAO + Math.abs(Math.sin(i.bob)) * 10}px`,
                filter: `drop-shadow(0 0 10px ${VILOES[i.vilao]!.cor})`,
              }}
            />
          ))}

          {fim && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-center">
              <p className="font-display text-2xl uppercase tracking-tight text-primary">
                {derrotado !== null ? `${VILOES[derrotado]!.nome} te pegou!` : "Fim de jogo"}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Pontos: {pontos}
              </p>
              <button
                type="button"
                onClick={reiniciar}
                className="mt-1 rounded-full border border-primary bg-primary/15 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-primary"
              >
                Jogar de novo
              </button>
            </div>
          )}
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
