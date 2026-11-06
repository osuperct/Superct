import { useEffect, useRef, useState, type TouchEvent } from "react";

import video1 from "@/assets/video1.mp4.asset.json";
import video2 from "@/assets/video2.mp4.asset.json";
import video3 from "@/assets/video3.mp4.asset.json";
import { assetUrl } from "@/lib/assetUrl";

export type VideoApp = { url: string; com_som: boolean; inicio: number; fim: number | null };

const PADRAO: VideoApp[] = [assetUrl(video2), assetUrl(video1), assetUrl(video3)].map((url) => ({
  url,
  com_som: false,
  inicio: 0,
  fim: null,
}));

const ZONA_CONTROLES = 74; // altura da barra nativa de controles: o gesto ali não troca de vídeo
const MINIMO_DEDU = 52; // deslize horizontal mínimo, em px, para passar para o próximo vídeo
const LIMITE_VISUAL = 70; // tope do deslocamento visual durante o deslize

export function VideoShowcase({ videos }: { videos?: VideoApp[] }) {
  const lista = videos && videos.length > 0 ? videos : PADRAO;
  const [atual, setAtual] = useState(0);
  const [deslocamento, setDeslocamento] = useState(0);
  const ref = useRef<HTMLVideoElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const toque = useRef<{ x: number; y: number; dx: number; dy: number; valido: boolean } | null>(null);
  const item = lista[Math.min(atual, lista.length - 1)]!;

  const proximo = () => setAtual((i) => (i + 1) % lista.length);
  const anterior = () => setAtual((i) => (i - 1 + lista.length) % lista.length);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = !item.com_som;
    if (item.inicio > 0) v.currentTime = item.inicio;
    const tocar = () => v.play().catch(() => {});
    tocar();
    v.addEventListener("canplay", tocar);
    return () => v.removeEventListener("canplay", tocar);
  }, [atual, item.com_som, item.inicio]);

  const aoIniciar = (e: TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0];
    if (!t || lista.length < 2) return;
    const caixa = area.current?.getBoundingClientRect();
    const naBarra = caixa ? t.clientY > caixa.bottom - ZONA_CONTROLES : false;
    toque.current = { x: t.clientX, y: t.clientY, dx: 0, dy: 0, valido: !naBarra };
  };

  const aoMover = (e: TouchEvent<HTMLDivElement>) => {
    const inicio = toque.current;
    const t = e.touches[0];
    if (!inicio?.valido || !t) return;
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    if (Math.abs(dx) <= Math.abs(dy)) return; // é rolagem da página para cima/baixo
    inicio.dx = dx;
    inicio.dy = dy;
    setDeslocamento(Math.max(-LIMITE_VISUAL, Math.min(LIMITE_VISUAL, dx)));
  };

  const aoSoltar = () => {
    const inicio = toque.current;
    toque.current = null;
    setDeslocamento(0);
    if (!inicio?.valido) return;
    if (Math.abs(inicio.dx) < MINIMO_DEDU) return;
    if (Math.abs(inicio.dx) < Math.abs(inicio.dy) * 1.2) return;
    if (inicio.dx < 0) proximo();
    else anterior();
  };

  const deslizando = deslocamento !== 0;

  return (
    <section className="pl-16 pr-4 pt-4 sm:px-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-[2px] w-8 bg-primary" />
        <h2 className="truncate font-display text-2xl uppercase tracking-tight">SUPER CT EM AÇÃO</h2>
      </div>

      <div
        ref={area}
        className="relative mx-auto aspect-[9/16] max-h-[75vh] w-full max-w-[340px] overflow-hidden rounded-lg border border-border bg-black sm:max-w-sm"
        style={{ touchAction: "pan-y" }}
        onTouchStart={aoIniciar}
        onTouchMove={aoMover}
        onTouchEnd={aoSoltar}
        onTouchCancel={aoSoltar}
      >
        <video
          ref={ref}
          key={item.url}
          src={item.url}
          className={`absolute top-0 left-1/2 h-full w-[160%] object-cover ${lista.length > 1 ? "animate-video-in" : ""}`}
          style={{
            transform: `translateX(calc(-50% + ${deslocamento}px))`,
            transition: deslizando ? "none" : "transform 0.22s ease",
          }}
          autoPlay
          loop={lista.length === 1 && !item.fim}
          muted={!item.com_som}
          playsInline
          preload="auto"
          controls
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (item.fim && v.currentTime >= item.fim) {
              if (lista.length === 1) {
                v.currentTime = item.inicio;
                void v.play();
              } else {
                proximo();
              }
            }
          }}
          onEnded={proximo}
        />

        {lista.length > 1 && (
          <div className="pointer-events-none absolute bottom-2 left-2 flex gap-1">
            {lista.map((v, i) => (
              <span
                key={v.url}
                className={`h-1 w-6 rounded-full ${i === atual ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
        )}
      </div>

      {lista.length > 1 && (
        <p className="mt-3 text-center text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          Deslize para o lado para trocar de vídeo
        </p>
      )}
    </section>
  );
}
