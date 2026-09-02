import { useEffect, useRef, useState } from "react";

import video1 from "@/assets/video1.mp4.asset.json";

const VIDEOS = [video1.url];

export function VideoShowcase() {
  const [atual, setAtual] = useState(0);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const tocar = () => v.play().catch(() => {});
    tocar();
    v.addEventListener("canplay", tocar);
    return () => v.removeEventListener("canplay", tocar);
  }, [atual]);

  return (
    <section className="px-4 pt-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-[2px] w-8 bg-primary" />
        <h2 className="font-display text-2xl uppercase tracking-tight">SUPER CT EM AÇÃO</h2>
      </div>

      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-lg border border-border bg-surface">
        <video
          ref={ref}
          key={atual}
          src={VIDEOS[atual]}
          className="h-full w-full object-cover"
          autoPlay
          loop={VIDEOS.length === 1}
          muted
          playsInline
          preload="auto"
          controls
          onEnded={() => setAtual((i) => (i + 1) % VIDEOS.length)}
        />

        {VIDEOS.length > 1 && (
          <div className="pointer-events-none absolute bottom-2 left-2 flex gap-1">
            {VIDEOS.map((v, i) => (
              <span
                key={v}
                className={`h-1 w-6 rounded-full ${i === atual ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
