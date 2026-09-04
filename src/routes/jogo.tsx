import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import mascote from "@/assets/mascote-menino.jpg.asset.json";
import logoVazada from "@/assets/super-ct-outline-white.png";
import { VILOES } from "@/data/viloes";

const TITLE = "Super Jogo — Academia dos vilões do Super CT | Professor Tio Victor";
const DESCRIPTION =
  "Corra dentro da academia do Super CT: pendure na barra, segure nas argolas, suba nas caixas de crossfit e esquive dos vilões com os controles na tela.";

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

/* ---------- mundo ---------- */
const MUNDO = 4200;
const ALTURA_CENA = 260;
const GRAVIDADE = -1.25;
const IMPULSO = 17.5;
const VELOCIDADE = 2.8;
const HEROI_W = 34;
const HEROI_H = 44;
const HEROI_H_ABAIXADO = 24;

type Solido = { x: number; w: number; h: number; tipo: "caixa" | "step" };
type Barra = { x: number; w: number; y: number };
type Argola = { x: number; y: number };
type Corda = { x: number; base: number; topo: number };
type Jump = { x: number; w: number; h: number };
type Parede = { x: number; w: number; h: number };
type Pino = { x: number; y: number; cor: string };

const SOLIDOS: Solido[] = [
  { x: 430, w: 72, h: 56, tipo: "caixa" },
  { x: 640, w: 58, h: 22, tipo: "step" },
  { x: 706, w: 58, h: 40, tipo: "step" },
  { x: 960, w: 84, h: 82, tipo: "caixa" },
  { x: 1180, w: 58, h: 24, tipo: "step" },
  { x: 1560, w: 72, h: 58, tipo: "caixa" },
  { x: 1760, w: 58, h: 30, tipo: "step" },
  { x: 2160, w: 92, h: 96, tipo: "caixa" },
  { x: 2420, w: 58, h: 24, tipo: "step" },
  { x: 2488, w: 58, h: 46, tipo: "step" },
  { x: 2960, w: 76, h: 66, tipo: "caixa" },
  { x: 3320, w: 58, h: 26, tipo: "step" },
  { x: 3600, w: 88, h: 86, tipo: "caixa" },
];

const BARRAS: Barra[] = [
  { x: 250, w: 230, y: 150 },
  { x: 1980, w: 210, y: 152 },
  { x: 3420, w: 200, y: 148 },
];

const ARGOLAS: Argola[] = [
  { x: 1280, y: 132 },
  { x: 1372, y: 140 },
  { x: 1464, y: 132 },
  { x: 2680, y: 138 },
  { x: 2776, y: 146 },
  { x: 2872, y: 138 },
];

const CORDAS: Corda[] = [
  { x: 3125, base: 26, topo: 205 },
  { x: 3235, base: 34, topo: 205 },
];

const JUMPS: Jump[] = [{ x: 3870, w: 86, h: 18 }];

/* paredes de escalada (pretas com pinos coloridos) */
const PAREDES: Parede[] = [
  { x: 790, w: 150, h: 200 },
  { x: 3700, w: 160, h: 210 },
];
const VELOCIDADE_ESCALADA = 2.2;

const CORES_PINO = ["#f97316", "#22d3ee", "#a855f7", "#84cc16", "#f43f5e", "#facc15"];
const PINOS: Pino[][] = PAREDES.map((p, pi) =>
  Array.from({ length: 26 }).map((_, i) => ({
    x: 14 + ((i * 37 + pi * 19) % (p.w - 28)),
    y: 16 + ((i * 29 + pi * 11) % (p.h - 30)),
    cor: CORES_PINO[(i + pi) % CORES_PINO.length]!,
  })),
);


/* cones decorativos no tatame (não colidem) */
const CONES: number[] = [
  180, 340, 560, 820, 900, 1100, 1340, 1500, 1700, 1900, 2050, 2300, 2560, 2750,
  2900, 3100, 3260, 3480, 3720, 3900, 4050,
];

type Padrao = "reta" | "queda" | "zigue";
type Inimigo = {
  id: number;
  x: number;
  y: number;
  vilao: number;
  padrao: Padrao;
  vx: number;
  fase: number;
  base: number;
};

const alturaHeroi = (abaixado: boolean) => (abaixado ? HEROI_H_ABAIXADO : HEROI_H);

function JogoPage() {
  const palcoRef = useRef<HTMLDivElement>(null);

  const [heroX, setHeroX] = useState(60);
  const [heroY, setHeroY] = useState(0);
  const [camera, setCamera] = useState(0);
  const [inimigos, setInimigos] = useState<Inimigo[]>([]);
  const [pontos, setPontos] = useState(0);
  const [pendurado, setPendurado] = useState<false | "barra" | "argola" | "corda" | "parede">(false);
  const [abaixado, setAbaixado] = useState(false);
  const [fim, setFim] = useState(false);
  const [venceu, setVenceu] = useState(false);
  const [derrotado, setDerrotado] = useState<number | null>(null);

  const dir = useRef(0);
  const x = useRef(60);
  const y = useRef(0);
  const vy = useRef(0);
  const noAr = useRef(false);
  const seguro = useRef<false | "barra" | "argola" | "corda" | "parede">(false);
  const subindo = useRef(false);
  const descendoParede = useRef(false);
  const ultimoToqueBaixo = useRef<number | null>(null);
  const bloquearAgarreAte = useRef(0);
  const duck = useRef(false);
  const fimRef = useRef(false);
  const vistaRef = useRef(360);
  const nextId = useRef(0);
  const spawn = useRef(60);
  const tick = useRef(0);
  const maxX = useRef(60);
  const passados = useRef(0);

  useEffect(() => {
    const el = palcoRef.current;
    if (!el) return;
    const medir = () => {
      const w = el.clientWidth;
      vistaRef.current = w;
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const reiniciar = useCallback(() => {
    dir.current = 0;
    x.current = 60;
    y.current = 0;
    vy.current = 0;
    noAr.current = false;
    seguro.current = false;
    duck.current = false;
    subindo.current = false;
    descendoParede.current = false;
    fimRef.current = false;
    nextId.current = 0;
    spawn.current = 60;
    tick.current = 0;
    maxX.current = 60;
    passados.current = 0;
    ultimoToqueBaixo.current = null;
    bloquearAgarreAte.current = 0;
    setHeroX(60);
    setHeroY(0);
    setCamera(0);
    setInimigos([]);
    setPontos(0);
    setPendurado(false);
    setAbaixado(false);
    setDerrotado(null);
    setVenceu(false);
    setFim(false);
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (fimRef.current) return;
      tick.current += 1;

      const alt = alturaHeroi(duck.current);

      /* ---- movimento horizontal ---- */
      if (dir.current !== 0) {
        const alvo = x.current + dir.current * (seguro.current ? VELOCIDADE * 0.7 : VELOCIDADE);
        let livre = true;
        if (!seguro.current) {
          for (const s of SOLIDOS) {
            const dentro = alvo + HEROI_W > s.x && alvo < s.x + s.w;
            if (dentro && y.current < s.h - 6) {
              livre = false;
              break;
            }
          }
        }
        if (livre) x.current = Math.min(MUNDO - HEROI_W, Math.max(0, alvo));
      }

      /* ---- vertical ---- */
      if (seguro.current) {
        // pendurado: continua colado no aparelho mais próximo
        let apoio = 0;
        if (seguro.current === "barra") {
          const b = BARRAS.find((b) => x.current + HEROI_W / 2 > b.x && x.current + HEROI_W / 2 < b.x + b.w);
          if (b) apoio = b.y - alt;
          else seguro.current = false;
        } else if (seguro.current === "argola") {
          const a = ARGOLAS.find((a) => Math.abs(a.x - (x.current + HEROI_W / 2)) < 34);
          if (a) apoio = a.y - alt;
          else seguro.current = false;
        } else if (seguro.current === "parede") {
          const cx = x.current + HEROI_W / 2;
          const p = PAREDES.find((p) => cx > p.x - 6 && cx < p.x + p.w + 6);
          if (p) {
            x.current = Math.min(p.x + p.w - HEROI_W, Math.max(p.x, x.current));
            const delta = subindo.current
              ? VELOCIDADE_ESCALADA
              : descendoParede.current
                ? -VELOCIDADE_ESCALADA
                : 0;
            apoio = Math.min(p.h - alt, Math.max(0, y.current + delta));
          } else seguro.current = false;
        } else {
          const corda = CORDAS.find((c) => Math.abs(c.x - (x.current + HEROI_W / 2)) < 28);
          if (corda) {
            x.current = corda.x - HEROI_W / 2;
            apoio = Math.min(corda.topo - alt, Math.max(corda.base, y.current + 0.7));
          } else seguro.current = false;
        }
        if (seguro.current) {
          y.current = apoio;
          vy.current = 0;
          noAr.current = false;
        } else {
          noAr.current = true;
        }
      } else if (noAr.current || y.current > 0) {
        const anterior = y.current;
        vy.current += GRAVIDADE;
        let prox = y.current + vy.current;

        // agarrar barra, argola ou corda durante o salto
        if (vy.current > -4 && performance.now() >= bloquearAgarreAte.current) {
          const topo = prox + alt;
          const cx = x.current + HEROI_W / 2;
          const barra = BARRAS.find((b) => cx > b.x && cx < b.x + b.w && Math.abs(topo - b.y) < 16);
          const argola = ARGOLAS.find((a) => Math.abs(a.x - cx) < 26 && Math.abs(topo - a.y) < 20);
          const corda = CORDAS.find(
            (c) => Math.abs(c.x - cx) < 22 && prox + alt > c.base && prox < c.topo,
          );
          const parede = PAREDES.find(
            (p) => cx > p.x - 4 && cx < p.x + p.w + 4 && prox >= 0 && prox < p.h - alt,
          );
          if (barra) {
            seguro.current = "barra";
            y.current = barra.y - alt;
            vy.current = 0;
            noAr.current = false;
          } else if (argola) {
            seguro.current = "argola";
            y.current = argola.y - alt;
            vy.current = 0;
            noAr.current = false;
          } else if (corda) {
            seguro.current = "corda";
            x.current = corda.x - HEROI_W / 2;
            y.current = Math.min(corda.topo - alt, Math.max(corda.base, prox));
            vy.current = 0;
            noAr.current = false;
          } else if (parede) {
            seguro.current = "parede";
            x.current = Math.min(parede.x + parede.w - HEROI_W, Math.max(parede.x, x.current));
            y.current = Math.max(0, prox);
            vy.current = 0;
            noAr.current = false;
          }
        }

        if (!seguro.current) {
          // pousar em caixas e steps
          if (vy.current < 0) {
            const jump = JUMPS.find(
              (j) => x.current + HEROI_W > j.x + 2 && x.current < j.x + j.w - 2 && anterior >= j.h && prox <= j.h,
            );
            if (jump) {
              prox = jump.h;
              vy.current = IMPULSO * 1.2;
              noAr.current = true;
            }
            for (const s of SOLIDOS) {
              const sobre = x.current + HEROI_W > s.x + 2 && x.current < s.x + s.w - 2;
              if (!jump && sobre && anterior >= s.h && prox <= s.h) {
                prox = s.h;
                vy.current = 0;
                noAr.current = false;
                break;
              }
            }
          }
          if (prox <= 0) {
            prox = 0;
            vy.current = 0;
            noAr.current = false;
          }
          y.current = prox;
        }
      } else {
        // no chão: cair de plataforma quando sai dela
        if (y.current > 0) {
          const apoiado = SOLIDOS.some(
            (s) => x.current + HEROI_W > s.x + 2 && x.current < s.x + s.w - 2 && Math.abs(y.current - s.h) < 2,
          );
          if (!apoiado) noAr.current = true;
        }
      }

      if (y.current > 0 && !seguro.current && !noAr.current) {
        const apoiado = SOLIDOS.some(
          (s) => x.current + HEROI_W > s.x + 2 && x.current < s.x + s.w - 2 && Math.abs(y.current - s.h) < 3,
        );
        if (!apoiado) noAr.current = true;
      }

      setHeroX(x.current);
      setHeroY(y.current);
      setPendurado(seguro.current);

      /* ---- câmera ---- */
      const vista = vistaRef.current;
      const cam = Math.min(Math.max(0, MUNDO - vista), Math.max(0, x.current - vista * 0.35));
      setCamera(cam);

      /* ---- pontuação por avanço ---- */
      if (x.current > maxX.current) {
        maxX.current = x.current;
        setPontos(passados.current + Math.floor((maxX.current - 60) / 60));
      }

      if (x.current >= MUNDO - HEROI_W - 4) {
        fimRef.current = true;
        setVenceu(true);
        setFim(true);
      }

      /* ---- inimigos ---- */
      spawn.current -= 1;
      if (spawn.current <= 0) {
        spawn.current = 70 + Math.floor(Math.random() * 60);
        const vilao = Math.floor(Math.random() * VILOES.length);
        const r = Math.random();
        const padrao: Padrao = r < 0.4 ? "reta" : r < 0.7 ? "queda" : "zigue";
        const base = padrao === "reta" ? 0 : 90 + Math.random() * 60;
        setInimigos((prev) => [
          ...prev,
          {
            id: nextId.current++,
            x: cam + vista + 30,
            y: base,
            vilao,
            padrao,
            vx: 1.5 + Math.min(1.4, tick.current / 4000) + Math.random() * 0.6,
            fase: Math.random() * Math.PI * 2,
            base,
          },
        ]);
      }

      setInimigos((prev) => {
        const proximos: Inimigo[] = [];
        const hx = x.current;
        const hy = y.current;
        const hAlt = alturaHeroi(duck.current);
        for (const i of prev) {
          const nx = i.x - i.vx;
          let ny = i.y;
          if (i.padrao === "queda") ny = Math.max(0, i.y - 0.9);
          if (i.padrao === "zigue") ny = Math.max(0, i.base + Math.sin((tick.current + i.fase * 30) / 22) * 46);
          if (nx < cam - 90) {
            passados.current += 1;
            setPontos(passados.current + Math.floor((maxX.current - 60) / 60));
            continue;
          }
          const bateX = nx + 34 > hx + 4 && nx + 4 < hx + HEROI_W - 4;
          const bateY = ny + 34 > hy + 4 && ny + 4 < hy + hAlt;
          if (bateX && bateY) {
            fimRef.current = true;
            setFim(true);
            setDerrotado(i.vilao);
          }
          proximos.push({ ...i, x: nx, y: ny, fase: i.fase });
        }
        return proximos;
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pular = () => {
    if (fimRef.current) return;
    if (seguro.current === "parede") {
      subindo.current = true;
      duck.current = false;
      setAbaixado(false);
      return;
    }
    duck.current = false;
    setAbaixado(false);
    if (seguro.current) {
      seguro.current = false;
      noAr.current = true;
      vy.current = IMPULSO * 0.85;
      return;
    }
    if (noAr.current) return;
    noAr.current = true;
    vy.current = IMPULSO;
  };

  const pararSubida = () => {
    subindo.current = false;
  };

  const descer = (ativo: boolean) => () => {
    if (fimRef.current) return;
    if (ativo && seguro.current) {
      const agora = performance.now();
      const toqueAnterior = ultimoToqueBaixo.current;
      if (toqueAnterior !== null && agora - toqueAnterior <= 2000) {
        seguro.current = false;
        noAr.current = true;
        subindo.current = false;
        descendoParede.current = false;
        duck.current = false;
        setAbaixado(false);
        y.current = Math.max(0, y.current - 4);
        vy.current = -6;
        bloquearAgarreAte.current = agora + 650;
        ultimoToqueBaixo.current = null;
        setPendurado(false);
        return;
      }
      ultimoToqueBaixo.current = agora;
      if (seguro.current === "parede") {
        subindo.current = false;
        descendoParede.current = true;
      }
      return;
    }
    if (!ativo) descendoParede.current = false;
    if (ativo) ultimoToqueBaixo.current = null;
    duck.current = ativo;
    setAbaixado(ativo);
  };

  const mover = (valor: number) => () => {
    dir.current = valor;
  };
  const parar = () => {
    dir.current = 0;
  };

  const alt = alturaHeroi(abaixado);
  const progresso = Math.min(100, (heroX / (MUNDO - HEROI_W)) * 100);

  return (
    <div className="min-h-screen bg-background pl-16 text-foreground">
      <main className="mx-auto max-w-screen-md px-4 py-8">
        <h1 className="font-display text-4xl uppercase leading-none tracking-tighter">
          SUPER <span className="text-primary italic">JOGO</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Atravesse a academia do Super CT: pendure na barra, segure nas argolas, suba nas caixas de
          crossfit, pule os steps e se abaixe para esquivar dos vilões.
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

        {/* barra de progresso do percurso */}
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-card">
          <div className="h-full bg-primary" style={{ width: `${progresso}%` }} />
        </div>

        <div
          ref={palcoRef}
          className="relative mt-3 overflow-hidden rounded-lg border border-border bg-black"
          style={{ height: ALTURA_CENA }}
        >
          {/* teto laranja com neon */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#ff7a18] via-[#c2410c] to-transparent opacity-90" />
          <div className="absolute inset-x-0 top-10 h-[2px] bg-[#ff9f43] shadow-[0_0_16px_6px_rgba(255,140,0,0.55)]" />

          {/* mundo rolante */}
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: MUNDO, transform: `translate3d(${-camera}px,0,0)` }}
          >
            {/* parede de fundo */}
            <div className="absolute inset-x-0 bottom-0 top-10 bg-gradient-to-b from-[#141414] to-[#050505]" />

            {/* faixas neon na parede */}
            {Array.from({ length: Math.ceil(MUNDO / 400) }).map((_, i) => (
              <div
                key={`neon-${i}`}
                className="absolute w-[3px] bg-primary/50 shadow-[0_0_12px_3px] shadow-primary/40"
                style={{ left: i * 400 + 120, top: 46, height: 110 }}
              />
            ))}

            {/* tatame preto */}
            <div className="absolute inset-x-0 bottom-0 h-10 border-t-2 border-primary/50 bg-[#0b0b0b]" />
            {Array.from({ length: Math.ceil(MUNDO / 46) }).map((_, i) => (
              <div
                key={`tat-${i}`}
                className="absolute bottom-0 h-10 w-[46px] border-l border-white/5"
                style={{ left: i * 46 }}
              />
            ))}

            {/* barras fixas */}
            {BARRAS.map((b, i) => (
              <div key={`b-${i}`}>
                <div
                  className="absolute h-2 rounded-full bg-[#d4d4d8] shadow-[0_0_10px_2px_rgba(255,255,255,0.25)]"
                  style={{ left: b.x, width: b.w, bottom: 40 + b.y }}
                />
                <div className="absolute w-[5px] bg-[#3f3f46]" style={{ left: b.x, bottom: 40, height: b.y }} />
                <div
                  className="absolute w-[5px] bg-[#3f3f46]"
                  style={{ left: b.x + b.w - 5, bottom: 40, height: b.y }}
                />
              </div>
            ))}

            {/* argolas */}
            {ARGOLAS.map((a, i) => (
              <div key={`a-${i}`}>
                <div
                  className="absolute w-[3px] bg-[#52525b]"
                  style={{ left: a.x - 1, bottom: 40 + a.y, height: ALTURA_CENA - 40 - a.y - 10 }}
                />
                <div
                  className="absolute size-6 rounded-full border-[4px] border-[#f59e0b] shadow-[0_0_10px_2px_rgba(245,158,11,0.5)]"
                  style={{ left: a.x - 12, bottom: 40 + a.y - 12 }}
                />
              </div>
            ))}

            {/* cordas navais escaláveis */}
            {CORDAS.map((corda, i) => (
              <div
                key={`corda-${i}`}
                className="absolute w-3 rounded-b-full border-x-2 border-amber-200/70 bg-[repeating-linear-gradient(0deg,#92400e_0px,#92400e_5px,#f59e0b_6px,#f59e0b_9px)] shadow-[0_0_8px_rgba(245,158,11,0.35)]"
                style={{
                  left: corda.x - 6,
                  bottom: 40 + corda.base,
                  height: corda.topo - corda.base,
                }}
              />
            ))}

            {/* cones pequenos no tatame */}
            {CONES.map((x, i) => (
              <div key={`c-${i}`} className="absolute" style={{ left: x, bottom: 38 }}>
                <div className="h-[3px] w-4 rounded-full bg-[#f97316]/70" />
                <div
                  className="mx-auto -mt-[11px] h-3 w-0 border-x-[5px] border-b-[12px] border-x-transparent border-b-[#fb923c]"
                  style={{ filter: "drop-shadow(0 0 4px rgba(249,115,22,0.6))" }}
                />
              </div>
            ))}

            {/* caixas de crossfit e steps */}
            {SOLIDOS.map((s, i) =>
              s.tipo === "caixa" ? (
                <div
                  key={`s-${i}`}
                  className="absolute rounded-sm border border-primary/50 bg-[#1c1917] shadow-[0_0_12px_rgba(255,120,0,0.25)]"
                  style={{ left: s.x, width: s.w, height: s.h, bottom: 40 }}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-primary/70" />
                  <div className="absolute inset-2 rounded-sm border border-white/10" />
                  <div className="absolute inset-1 flex items-center justify-center">
                    <img
                      src={logoVazada}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-contain opacity-80"
                    />
                  </div>
                </div>
              ) : (
                <div
                  key={`s-${i}`}
                  className="absolute rounded-sm border border-white/20 bg-[#27272a]"
                  style={{ left: s.x, width: s.w, height: s.h, bottom: 40 }}
                >
                  <div className="absolute inset-x-0 top-0 h-[3px] bg-primary/60" />
                </div>
              ),
            )}

            {/* jump que lança o personagem automaticamente */}
            {JUMPS.map((jump, i) => (
              <div
                key={`jump-${i}`}
                className="absolute rounded-t-full border-2 border-cyan-200 bg-cyan-500/25 shadow-[0_0_16px_rgba(34,211,238,0.75)]"
                style={{ left: jump.x, width: jump.w, height: jump.h, bottom: 40 }}
              >
                <div className="absolute inset-x-3 top-1 h-1 rounded-full bg-cyan-100" />
              </div>
            ))}


            {/* herói */}
            <img
              src={mascote.url}
              alt="Herói do Super CT"
              className="absolute rounded-full border-2 border-primary object-cover transition-[height] duration-100"
              style={{
                left: heroX,
                width: HEROI_W,
                height: alt,
                bottom: 40 + heroY,
                filter: pendurado ? "drop-shadow(0 0 8px rgba(255,140,0,0.8))" : undefined,
              }}
            />

            {/* vilões */}
            {inimigos.map((i) => (
              <img
                key={i.id}
                src={VILOES[i.vilao]!.img}
                alt={VILOES[i.vilao]!.nome}
                className="absolute h-9 w-9 object-contain"
                style={{
                  left: i.x,
                  bottom: 40 + i.y,
                  filter: `drop-shadow(0 0 8px ${VILOES[i.vilao]!.cor})`,
                }}
              />
            ))}
          </div>

          {pendurado && (
            <span className="absolute left-2 top-12 rounded-full bg-black/70 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-primary">
              {pendurado === "corda" ? "Subindo — pule para a próxima" : "Pendurado"} • ▼ 2x em 2s para soltar
            </span>
          )}

          {fim && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 text-center">
              <p className="font-display text-2xl uppercase tracking-tight text-primary">
                {venceu
                  ? "Você atravessou a academia!"
                  : derrotado !== null
                    ? `${VILOES[derrotado]!.nome} te pegou!`
                    : "Fim de jogo"}
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

        <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Setas movem • ▲ pula entre aparelhos • ▼ 2x em 2s solta • jump impulsiona sozinho
        </p>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="flex gap-3">
            <ControlButton onStart={mover(-1)} onEnd={parar} label="Mover para a esquerda">
              <ArrowLeft className="size-7" />
            </ControlButton>
            <ControlButton onStart={mover(1)} onEnd={parar} label="Mover para a direita">
              <ArrowRight className="size-7" />
            </ControlButton>
          </div>
          <div className="flex gap-3">
            <ControlButton onStart={descer(true)} onEnd={descer(false)} label="Abaixar e esquivar">
              <ChevronDown className="size-7" />
            </ControlButton>
            <ControlButton onStart={pular} label="Pular">
              <ChevronUp className="size-7" />
            </ControlButton>
          </div>
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
