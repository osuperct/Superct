import { useEffect, useRef, useState } from "react";

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

export function VideoShowcase({ videos }: { videos?: VideoApp[] }) {
  const lista = videos && videos.length > 0 ? videos : PADRAO;
  const [atual, setAtual] = useState(0);
  const ref = useRef<HTMLVideoElement>(null);
  const item = lista[Math.min(atual, lista.length - 1)]!;

  const proximo = () => setAtual((i) => (i + 1) % lista.length);

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

  return (
    <section className="pl-16 pr-4 pt-4 sm:px-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-[2px] w-8 bg-primary" />
        <h2 className="truncate font-display text-2xl uppercase tracking-tight">SUPER CT EM AÇÃO</h2>
      </div>

      <div className="relative mx-auto aspect-[3/4] max-h-[70vh] w-full max-w-[280px] overflow-hidden rounded-lg border border-border bg-surface sm:max-w-sm">
        <video
          ref={ref}
          key={item.url}
          src={item.url}
          className="absolute inset-0 h-full w-full object-cover"
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
    </section>
  );
}
