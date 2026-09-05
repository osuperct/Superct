import { useEffect, useRef, useState } from "react";
import { Check, Crop, X } from "lucide-react";

const ASPECTOS = [
  { rotulo: "4:3", valor: 4 / 3 },
  { rotulo: "1:1", valor: 1 },
  { rotulo: "3:4", valor: 3 / 4 },
  { rotulo: "16:9", valor: 16 / 9 },
];

type Props = {
  arquivo: File;
  aspectoInicial?: number;
  onPronto: (blob: Blob) => void;
  onCancelar: () => void;
};

/** Recorte simples: arraste para posicionar e use o zoom para ajustar. */
export function CortarImagem({ arquivo, aspectoInicial = 4 / 3, onPronto, onCancelar }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [aspecto, setAspecto] = useState(aspectoInicial);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const arrasto = useRef<{ x: number; y: number } | null>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(arquivo);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  function gerar() {
    const caixa = caixaRef.current;
    const img = imgRef.current;
    if (!caixa || !img) return;

    const larguraSaida = 1200;
    const canvas = document.createElement("canvas");
    canvas.width = larguraSaida;
    canvas.height = Math.round(larguraSaida / aspecto);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const escala = canvas.width / caixa.clientWidth;
    // A imagem é desenhada como aparece na moldura (object-contain + zoom + arraste).
    const rNatural = img.naturalWidth / img.naturalHeight;
    const rCaixa = caixa.clientWidth / caixa.clientHeight;
    let larguraBase = rNatural > rCaixa ? caixa.clientWidth : caixa.clientHeight * rNatural;
    let alturaBase = rNatural > rCaixa ? caixa.clientWidth / rNatural : caixa.clientHeight;
    larguraBase *= zoom;
    alturaBase *= zoom;
    const x = (caixa.clientWidth - larguraBase) / 2 + pos.x;
    const y = (caixa.clientHeight - alturaBase) / 2 + pos.y;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, x * escala, y * escala, larguraBase * escala, alturaBase * escala);
    canvas.toBlob((blob) => blob && onPronto(blob), "image/jpeg", 0.9);
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-background/60 p-3">
      <p className="flex items-center gap-2 font-display text-xs tracking-tight">
        <Crop className="size-4 text-primary" /> AJUSTAR E RECORTAR
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        {ASPECTOS.map((a) => (
          <button
            key={a.rotulo}
            type="button"
            onClick={() => setAspecto(a.valor)}
            className={`rounded-md border px-2 py-1 font-mono text-[10px] ${
              aspecto === a.valor ? "border-primary text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div
        ref={caixaRef}
        style={{ aspectRatio: String(aspecto) }}
        className="relative mt-2 w-full touch-none overflow-hidden rounded-md border border-border bg-black"
        onPointerDown={(e) => {
          arrasto.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!arrasto.current) return;
          setPos({ x: e.clientX - arrasto.current.x, y: e.clientY - arrasto.current.y });
        }}
        onPointerUp={() => {
          arrasto.current = null;
        }}
      >
        {src && (
          <img
            ref={imgRef}
            src={src}
            alt="Foto que está sendo ajustada"
            draggable={false}
            style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})` }}
            className="absolute inset-0 h-full w-full select-none object-contain"
          />
        )}
      </div>

      <label className="mt-2 block">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-[hsl(var(--primary))]"
        />
      </label>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={gerar}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 font-display text-xs tracking-tight text-primary-foreground"
        >
          <Check className="size-4" /> USAR ESTE RECORTE
        </button>
        <button
          type="button"
          onClick={onCancelar}
          aria-label="Cancelar recorte"
          className="rounded-md border border-border p-2 text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
