import { useEffect, useRef, useState } from "react";

import video1 from "@/assets/video1.mp4.asset.json";

const VIDEOS = [video1.url];

export function VideoShowcase() {
  const ref = useRef<HTMLVideoElement>(null);
  const [atual, setAtual] = useState(0);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.load();
    const p = v.play();
    if (p) p.catch(() => {});
  }, [atual]);

  return (
    <section className="px-4 pt-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-[2px] w-8 bg-primary" />
        <h2 className="font-display text-2xl uppercase tracking-tight">SUPER CT EM AÇÃO</h2>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-surface">
        {erro ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="font-display text-lg uppercase leading-tight">
              Espaço reservado para 2 vídeos
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              adicione public/videos/video1.mp4 e video2.mp4
            </p>
          </div>
        ) : (
          <video
            ref={ref}
            src={VIDEOS[atual]}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() => setAtual((i) => (i + 1) % VIDEOS.length)}
            onError={() => setErro(true)}
          />
        )}

        <div className="absolute bottom-2 left-2 flex gap-1">
          {VIDEOS.map((v, i) => (
            <span
              key={v}
              className={`h-1 w-6 rounded-full ${i === atual ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
