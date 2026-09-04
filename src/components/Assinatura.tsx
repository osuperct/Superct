import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";

/** Quadro de assinatura à canetinha (dedo ou mouse). */
export function Assinatura({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [temTraco, setTemTraco] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const escala = window.devicePixelRatio || 1;
    c.width = c.clientWidth * escala;
    c.height = c.clientHeight * escala;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.clientWidth, c.clientHeight);
  }, []);

  function ponto(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function iniciar(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    desenhando.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const p = ponto(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = ponto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!temTraco) setTemTraco(true);
  }

  function terminar() {
    if (!desenhando.current) return;
    desenhando.current = false;
    const c = canvasRef.current;
    if (c && temTraco) onChange(c.toDataURL("image/png"));
  }

  function limpar() {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.clientWidth, c.clientHeight);
    setTemTraco(false);
    onChange(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          <PenLine className="size-3 text-primary" /> Assine aqui com o dedo ou o mouse
        </span>
        <button
          type="button"
          onClick={limpar}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground"
        >
          <Eraser className="size-3" /> Limpar
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerLeave={terminar}
        onPointerCancel={terminar}
        className="mt-1 h-36 w-full touch-none rounded-md border border-primary/60 bg-white"
      />
    </div>
  );
}
